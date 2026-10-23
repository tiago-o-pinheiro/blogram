import { describe, expect, it } from 'vitest'

import { POST as finalize } from '@/app/api/setup/finalize/route'
import { PUT as saveProfile } from '@/app/api/setup/profile/route'
import { GET as getState } from '@/app/api/setup/route'
import { setupSessionService } from '@/server/modules/setup/services/setup-session.service'
import { setupService } from '@/server/modules/setup/services/setup.service'

const BASE_URL = 'http://localhost:3000/api/setup'
const INITIAL_PROFILE = { name: 'Private pending owner', description: 'Unpublished profile draft' }
const OWNER = {
  identifier: 'audit-owner@example.test',
  password: 'audit-password-12345',
  passwordConfirmation: 'audit-password-12345',
}

const deferred = () => {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((fulfill) => {
    resolve = fulfill
  })
  return { promise, resolve }
}

describe('Setup privacy and finalization races', () => {
  it('BH-1: Given a saved pending profile and no setup session, should keep the draft private', async () => {
    await setupService.saveProfile(INITIAL_PROFILE)

    const response = await getState(new Request(BASE_URL))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      status: 'pending',
      isUnlocked: false,
      profile: null,
    })
  })

  it('BH-2: Given a setup profile request paused after authorization, should reject its write after finalization', async () => {
    await setupService.saveProfile(INITIAL_PROFILE)
    const { token } = await setupSessionService.create()
    const cookie = `blogram_setup=${token}`
    const reading = deferred()
    const resumed = deferred()
    const body = new ReadableStream(
      {
        pull: async (controller) => {
          reading.resolve()
          await resumed.promise
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                name: 'Late setup write',
                description: 'Must not replace the completed profile',
              }),
            ),
          )
          controller.close()
        },
      },
      { highWaterMark: 0 },
    )
    const options: RequestInit & { duplex: 'half' } = {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body,
      duplex: 'half',
    }
    const delayedResponse = saveProfile(new Request(`${BASE_URL}/profile`, options))
    await reading.promise
    let completion: Response
    try {
      completion = await finalize(
        new Request(`${BASE_URL}/finalize`, {
          method: 'POST',
          headers: { cookie, 'content-type': 'application/json' },
          body: JSON.stringify(OWNER),
        }),
      )
    } finally {
      resumed.resolve()
    }
    const response = await delayedResponse

    expect(completion.status).toBe(200)
    expect(response.status).toBe(403)
    expect((await setupService.getState(new Headers())).profile).toMatchObject(INITIAL_PROFILE)
  })
})
