import { execFile } from 'node:child_process'

import { Type } from 'typebox'

import { ServiceUnavailableError, ValidationError } from '@/server/errors/http-errors'
import { decode } from '@/server/lib/codec'

const VideoProbe = Type.Object({
  streams: Type.Array(
    Type.Object({
      codec_type: Type.Optional(Type.String()),
      codec_name: Type.Optional(Type.String()),
      width: Type.Optional(Type.Integer({ minimum: 1 })),
      height: Type.Optional(Type.Integer({ minimum: 1 })),
    }),
  ),
  format: Type.Object({ format_name: Type.String() }),
})

export const inspectVideo = async (
  bytes: Uint8Array,
): Promise<{ width: number; height: number; contentType: 'video/mp4' | 'video/webm' }> => {
  const output = await new Promise<string>((resolve, reject) => {
    const child = execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'pipe',
        '-show_entries',
        'format=format_name:stream=codec_type,codec_name,width,height',
        '-of',
        'json',
        'pipe:0',
      ],
      { timeout: 15000, maxBuffer: 65536 },
      (error, stdout) => {
        if (error) {
          if ('code' in error && error.code === 'ENOENT') {
            reject(new ServiceUnavailableError('Video uploads require ffprobe on the server'))
            return
          }
          reject(new ValidationError('Invalid video'))
          return
        }
        resolve(stdout)
      },
    )
    child.stdin?.on('error', () => undefined)
    child.stdin?.end(bytes)
  })
  let probe: unknown
  try {
    probe = JSON.parse(output)
  } catch {
    throw new ValidationError('Invalid video')
  }
  const metadata = decode(VideoProbe, probe)
  const video = metadata.streams.find((stream) => stream.codec_type === 'video')
  if (!video?.width || !video.height || !video.codec_name) {
    throw new ValidationError('A video stream is required')
  }
  const formats = metadata.format.format_name.split(',')
  if (formats.includes('mp4') && ['h264', 'hevc', 'av1'].includes(video.codec_name)) {
    return { width: video.width, height: video.height, contentType: 'video/mp4' }
  }
  if (formats.includes('webm') && ['vp8', 'vp9', 'av1'].includes(video.codec_name)) {
    return { width: video.width, height: video.height, contentType: 'video/webm' }
  }
  throw new ValidationError('Use an MP4 or WebM video with a supported video codec')
}
