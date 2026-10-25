import { Type } from 'typebox'

import { encode } from '@/server/lib/codec'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import {
  mediaCleanupService,
  type MediaCleanupService,
} from '@/server/modules/media/services/media-cleanup.service'
import {
  videoUploadService,
  type VideoUploadService,
} from '@/server/modules/media/services/video-upload.service'

const CleanupStatus = Type.Object({
  deleted: Type.Integer({ minimum: 0 }),
  pending: Type.Integer({ minimum: 0 }),
})

export class MediaCleanupController {
  constructor(
    private readonly cleanup: MediaCleanupService,
    private readonly videoUploads: Pick<VideoUploadService, 'sweepExpired'>,
  ) {}

  drain: SessionRouteHandler = async () => {
    await this.videoUploads.sweepExpired()
    return Response.json(encode(CleanupStatus, await this.cleanup.drain()), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export const mediaCleanupController = new MediaCleanupController(
  mediaCleanupService,
  videoUploadService,
)
