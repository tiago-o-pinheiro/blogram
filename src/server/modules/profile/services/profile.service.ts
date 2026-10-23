import { eq } from 'drizzle-orm'

import { type Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { db, type DbTransaction } from '@/server/lib/db'
import { storage, type StorageDriver, type StorageObject } from '@/server/lib/storage'
import {
  installationService,
  type InstallationService,
} from '@/server/modules/installation/services/installation.service'
import { MediaCleanupService } from '@/server/modules/media/services/media-cleanup.service'
import { mediaService, type MediaService } from '@/server/modules/media/services/media.service'
import { profile } from '@/server/modules/profile/schemas/profile.table'

const SINGLETON_ID = 'singleton'

type ProfileServiceDependencies = {
  storage: StorageDriver
  installation?: InstallationService
  media?: Pick<MediaService, 'processProfilePhoto' | 'deleteObjects'>
}

export class ProfileService {
  private readonly storage: StorageDriver
  private readonly installation: InstallationService
  private readonly media: Pick<MediaService, 'processProfilePhoto' | 'deleteObjects'>
  private readonly cleanup: MediaCleanupService

  constructor(dependencies: ProfileServiceDependencies) {
    this.storage = dependencies.storage
    this.installation = dependencies.installation ?? installationService
    this.media = dependencies.media ?? mediaService
    this.cleanup = new MediaCleanupService(this.storage)
  }

  getSettings = async (): Promise<Models.SiteSettings> => {
    const [row] = await db
      .select({ defaultLocale: profile.defaultLocale })
      .from(profile)
      .where(eq(profile.id, SINGLETON_ID))
    return { defaultLocale: row?.defaultLocale ?? 'en' }
  }

  saveSettings = async (settings: Models.SiteSettings): Promise<Models.SiteSettings> => {
    const { defaultLocale } = settings
    await db
      .insert(profile)
      .values({ id: SINGLETON_ID, name: '', defaultLocale })
      .onConflictDoUpdate({ target: profile.id, set: { defaultLocale } })
    return this.getSettings()
  }

  replacePhoto = async (file: File): Promise<Models.Profile> => {
    const photo = await this.media.processProfilePhoto(file)
    try {
      await db.transaction((tx) => this.setPhoto(photo.key, photo.contentType, tx))
    } catch (error) {
      await this.media.deleteObjects([photo.key])
      throw error
    }
    await this.cleanup.drain()
    return this.requireProfile()
  }

  getProfile = async (tx?: DbTransaction): Promise<Models.Profile | null> => {
    const [row] = await (tx ?? db).select().from(profile).where(eq(profile.id, SINGLETON_ID))
    if (!row) {
      return null
    }
    return { name: row.name, description: row.description, hasPhoto: row.photoKey !== null }
  }

  saveProfile = async (
    bundle: Models.ProfileBundle,
    tx?: DbTransaction,
  ): Promise<Models.Profile> => {
    const name = bundle.name.trim()
    const description = bundle.description.trim()
    await (tx ?? db)
      .insert(profile)
      .values({ id: SINGLETON_ID, name, description })
      .onConflictDoUpdate({
        target: profile.id,
        set: { name, description },
      })
    return this.requireProfile(tx)
  }

  setPhoto = async (
    key: string,
    contentType: string,
    tx?: DbTransaction,
  ): Promise<string | null> => {
    if (!tx) {
      const previousKey = await db.transaction((transaction) =>
        this.setPhoto(key, contentType, transaction),
      )
      await this.cleanup.drain()
      return previousKey
    }
    await tx.insert(profile).values({ id: SINGLETON_ID, name: '' }).onConflictDoNothing()
    const [previous] = await tx
      .select({ photoKey: profile.photoKey })
      .from(profile)
      .where(eq(profile.id, SINGLETON_ID))
      .for('update')
    await tx
      .update(profile)
      .set({ photoKey: key, photoContentType: contentType })
      .where(eq(profile.id, SINGLETON_ID))
    if (previous?.photoKey && previous.photoKey !== key) {
      await this.cleanup.enqueue(tx, [previous.photoKey])
    }
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

  private requireProfile = async (tx?: DbTransaction): Promise<Models.Profile> => {
    const saved = await this.getProfile(tx)
    if (!saved) {
      throw new NotFoundError('Profile not found')
    }
    return saved
  }
}

export const profileService = new ProfileService({ storage })
