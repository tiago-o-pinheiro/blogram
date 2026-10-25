import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendPartWithXhr } from './upload-video-parts'

class RecordingXhr {
  static instances: RecordingXhr[] = []
  status = 200
  timeout = 0
  upload: { onprogress: ((event: { loaded: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null
  constructor() {
    RecordingXhr.instances.push(this)
  }
  open() {}
  send() {
    this.onload?.()
  }
  getResponseHeader() {
    return '"etag-1"'
  }
  abort() {}
}

describe('sendPartWithXhr', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    RecordingXhr.instances = []
  })

  it('BH-3: Given a part request, should arm the XHR timeout so a stalled connection resolves as status 0 and is retried', async () => {
    vi.stubGlobal('XMLHttpRequest', RecordingXhr)

    await sendPartWithXhr({
      url: 'https://bucket.test/part-1',
      body: new Blob(['abcd']),
      onProgress: () => undefined,
    })

    const [xhr] = RecordingXhr.instances
    expect(xhr?.timeout).toBeGreaterThan(0)
  })
})
