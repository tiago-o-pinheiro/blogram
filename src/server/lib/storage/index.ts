import { StatusCodes } from 'http-status-codes'

import { env, type Env } from '@/server/config/env'
import { GlobalError } from '@/server/errors/global-error'

import { type DirectUploadDriver, type StorageDriver } from './driver'
import { createLocalDriver } from './local-driver'
import { createS3Driver } from './s3-driver'

export { createStorageKey } from './driver'
export type {
  ByteRange,
  DirectUploadDriver,
  MultipartPart,
  StorageDriver,
  StoredObjectHead,
  StorageObject,
  StorageReadOptions,
} from './driver'

const createConfiguredS3Driver = (config: Env) => {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = config
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new GlobalError(
      'STORAGE_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
      StatusCodes.INTERNAL_SERVER_ERROR,
    )
  }
  return createS3Driver({
    endpoint: S3_ENDPOINT,
    region: config.S3_REGION,
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
  })
}

export const createStorage = (config: Env): StorageDriver => {
  if (config.STORAGE_DRIVER === 'local') {
    return createLocalDriver(config.STORAGE_LOCAL_DIR)
  }
  return createConfiguredS3Driver(config)
}

export const createDirectUploads = (config: Env): DirectUploadDriver | null => {
  if (config.STORAGE_DRIVER === 'local') {
    return null
  }
  return createConfiguredS3Driver(config)
}

let instance: StorageDriver | null = null
let s3Instance: (StorageDriver & DirectUploadDriver) | null = null

const getS3 = (): StorageDriver & DirectUploadDriver => {
  s3Instance ??= createConfiguredS3Driver(env)
  return s3Instance
}

export const storage: StorageDriver = {
  put: (key, body, contentType) => getStorage().put(key, body, contentType),
  get: (key, options) => getStorage().get(key, options),
  delete: (key) => getStorage().delete(key),
}

const getStorage = (): StorageDriver => {
  instance ??= env.STORAGE_DRIVER === 'local' ? createStorage(env) : getS3()
  return instance
}

export const directUploads = (): DirectUploadDriver | null =>
  env.STORAGE_DRIVER === 'local' ? null : getS3()
