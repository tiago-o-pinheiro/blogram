import { execFile } from 'node:child_process'

export const createWebm = async (): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'color=c=black:s=64x96:d=0.2',
        '-c:v',
        'libvpx-vp9',
        '-f',
        'webm',
        'pipe:1',
      ],
      { encoding: 'buffer', timeout: 15000, maxBuffer: 1000000 },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        resolve(new Uint8Array(stdout))
      },
    )
  })
