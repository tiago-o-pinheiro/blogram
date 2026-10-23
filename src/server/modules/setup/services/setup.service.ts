import { Models } from '@/models'

import { ServiceUnavailableError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { authService, type AuthService } from '@/server/modules/auth/services/auth.service'
import {
  installationService,
  type InstallationService,
} from '@/server/modules/installation/services/installation.service'
import { mediaService, type MediaService } from '@/server/modules/media/services/media.service'
import {
  profileService,
  type ProfileService,
} from '@/server/modules/profile/services/profile.service'

import { setupAuthService, type SetupAuthService } from './setup-auth.service'
import { setupSessionService, type SetupSessionService } from './setup-session.service'

export type SetupEntry = 'installer-error' | 'unlock' | 'wizard' | 'completed'

type SetupServiceDependencies = {
  installation: Pick<InstallationService, 'getStatus' | 'assertPending' | 'completeInstallation'>
  profiles: Pick<ProfileService, 'getProfile' | 'saveProfile' | 'setPhoto'>
  sessions: Pick<SetupSessionService, 'readToken' | 'isValid' | 'revokeAll'>
  setupAuth: Pick<SetupAuthService, 'isConfigured'>
  media: Pick<MediaService, 'processProfilePhoto' | 'deleteObjects' | 'drainCleanup'>
  owners: Pick<AuthService, 'createOwner' | 'signInOwner'>
}

export class SetupService {
  constructor(private readonly dependencies: SetupServiceDependencies) {}

  getState = async (headers: Headers): Promise<Models.SetupState> => {
    const { installation, profiles, setupAuth } = this.dependencies
    const status = await installation.getStatus()
    const isUnlocked = status === 'pending' && (await this.hasSetupSession(headers))
    return {
      status,
      isConfigured: setupAuth.isConfigured(),
      isUnlocked,
      profile: status === 'completed' || isUnlocked ? await profiles.getProfile() : null,
    }
  }

  resolveEntry = async (headers: Headers): Promise<SetupEntry> => {
    const { installation, setupAuth } = this.dependencies
    if ((await installation.getStatus()) === 'completed') {
      return 'completed'
    }
    if (!setupAuth.isConfigured()) {
      return 'installer-error'
    }
    return (await this.hasSetupSession(headers)) ? 'wizard' : 'unlock'
  }

  saveProfile = (bundle: Models.ProfileBundle): Promise<Models.Profile> =>
    db.transaction(async (tx) => {
      await this.dependencies.installation.assertPending(tx)
      return this.dependencies.profiles.saveProfile(bundle, tx)
    })

  uploadPhoto = async (file: File): Promise<Models.Profile> => {
    const { installation, media, profiles } = this.dependencies
    await installation.assertPending()
    const photo = await media.processProfilePhoto(file)
    let saved: Models.Profile
    try {
      saved = await db.transaction(async (tx) => {
        await installation.assertPending(tx)
        await profiles.setPhoto(photo.key, photo.contentType, tx)
        const draft = await profiles.getProfile(tx)
        if (!draft) {
          throw new ValidationError('Profile is incomplete')
        }
        return draft
      })
    } catch (error) {
      await media.deleteObjects([photo.key])
      throw error
    }
    await media.drainCleanup()
    return saved
  }

  finalize = async (owner: Models.SetupOwner): Promise<{ authHeaders: Headers }> => {
    const { installation, profiles, sessions, owners } = this.dependencies
    if (!Models.isSetupOwner(owner) || !Models.hasMatchingPasswords(owner)) {
      throw new ValidationError('Owner account is invalid')
    }
    const identifier = Models.toOwnerIdentifier(owner.identifier)
    if (!identifier) {
      throw new ValidationError('Owner identifier is invalid')
    }
    await db.transaction(async (tx) => {
      await installation.assertPending(tx)
      const draft = await profiles.getProfile(tx)
      if (!draft || draft.name.length === 0) {
        throw new ValidationError('Profile is incomplete')
      }
      const { id } = await owners.createOwner(tx, {
        identifier: identifier.value,
        password: owner.password,
      })
      await installation.completeInstallation(tx, id)
      await sessions.revokeAll(tx)
    })
    const response = await owners.signInOwner(identifier.value, owner.password)
    if (!response.ok) {
      throw new ServiceUnavailableError('Installation completed but sign-in failed')
    }
    return { authHeaders: response.headers }
  }

  private hasSetupSession = (headers: Headers): Promise<boolean> =>
    this.dependencies.sessions.isValid(this.dependencies.sessions.readToken(headers))
}

export const setupService = new SetupService({
  installation: installationService,
  profiles: profileService,
  sessions: setupSessionService,
  setupAuth: setupAuthService,
  media: mediaService,
  owners: authService,
})
