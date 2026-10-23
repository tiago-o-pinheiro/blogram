import { eq } from 'drizzle-orm'

import { type Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { storage, type StorageDriver, type StorageObject } from '@/server/lib/storage'
import {
  installationService,
  type InstallationService,
} from '@/server/modules/installation/services/installation.service'
import { profile } from '@/server/modules/profile/schemas/profile.table'

const SINGLETON_ID = 'singleton'

type ProfileServiceDependencies = {
  storage: StorageDriver
  installation?: InstallationService
}

export class ProfileService {
  private readonly storage: StorageDriver
  private readonly installation: InstallationService

  constructor(dependencies: ProfileServiceDependencies) {
    this.storage = dependencies.storage
    this.installation = dependencies.installation ?? installationService
  }

  getProfile = async (): Promise<Models.Profile | null> => {
    const [row] = await db.select().from(profile).where(eq(profile.id, SINGLETON_ID))
    if (!row) {
      return null
    }
    return { name: row.name, description: row.description, hasPhoto: row.photoKey !== null }
  }

  saveProfile = async (bundle: Models.ProfileBundle): Promise<Models.Profile> => {
    const name = bundle.name.trim()
    const description = bundle.description.trim()
    await db.insert(profile).values({ id: SINGLETON_ID, name, description }).onConflictDoUpdate({
      target: profile.id,
      set: { name, description },
    })
    return this.requireProfile()
  }

  setPhoto = async (key: string, contentType: string): Promise<string | null> => {
    const [previous] = await db
      .select({ photoKey: profile.photoKey })
      .from(profile)
      .where(eq(profile.id, SINGLETON_ID))
    await db
      .insert(profile)
      .values({ id: SINGLETON_ID, name: '', photoKey: key, photoContentType: contentType })
      .onConflictDoUpdate({
        target: profile.id,
        set: { photoKey: key, photoContentType: contentType },
      })
    return previous?.photoKey ?? null
  }

  readPhoto = async (access: { hasSetupSession: boolean }): Promise<StorageObject> => {
    if (!access.hasSetupSession && (await this.installation.getStatus()) !== 'completed') {
      throw new NotFoundError('Photo not found')
    }
    const [row] = await db
      .select({ photoKey: profile.photoKey, photoContentType: profile.photoContentType })
      .from(profile)
      .where(eq(profile.id, SINGLETON_ID))
    if (!row?.photoKey) {
      throw new NotFoundError('Photo not found')
    }
    const object = await this.storage.get(row.photoKey)
    if (!object) {
      throw new NotFoundError('Photo not found')
    }
    return { ...object, contentType: row.photoContentType ?? object.contentType }
  }

  private requireProfile = async (): Promise<Models.Profile> => {
    const saved = await this.getProfile()
    if (!saved) {
      throw new NotFoundError('Profile not found')
    }
    return saved
  }
}

export const profileService = new ProfileService({ storage })
