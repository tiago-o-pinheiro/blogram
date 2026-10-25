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

export type VideoProbeResult = {
  width: number
  height: number
  contentType: 'video/mp4' | 'video/webm'
}

const PROBE_ENTRIES = 'format=format_name:stream=codec_type,codec_name,width,height'
const URL_READ_TIMEOUT_MICROSECONDS = '15000000'

const runProbe = (args: string[], timeout: number, input?: Uint8Array): Promise<VideoProbeResult> =>
  new Promise<string>((resolve, reject) => {
    const child = execFile('ffprobe', args, { timeout, maxBuffer: 65536 }, (error, stdout) => {
      if (error) {
        if ('code' in error && error.code === 'ENOENT') {
          reject(new ServiceUnavailableError('Video uploads require ffprobe on the server'))
          return
        }
        reject(new ValidationError('Invalid video'))
        return
      }
      resolve(stdout)
    })
    if (input) {
      child.stdin?.on('error', () => undefined)
      child.stdin?.end(input)
    }
  }).then(parseProbe)

export const inspectVideo = (bytes: Uint8Array): Promise<VideoProbeResult> =>
  runProbe(
    [
      '-v',
      'error',
      '-protocol_whitelist',
      'pipe',
      '-show_entries',
      PROBE_ENTRIES,
      '-of',
      'json',
      'pipe:0',
    ],
    15000,
    bytes,
  )

export const inspectVideoUrl = (url: string): Promise<VideoProbeResult> => {
  const whitelist = url.startsWith('https:') ? 'https,tls,tcp' : 'http,tcp'
  return runProbe(
    [
      '-v',
      'error',
      '-protocol_whitelist',
      whitelist,
      '-rw_timeout',
      URL_READ_TIMEOUT_MICROSECONDS,
      '-show_entries',
      PROBE_ENTRIES,
      '-of',
      'json',
      url,
    ],
    60000,
  )
}

const parseProbe = (output: string): VideoProbeResult => {
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
