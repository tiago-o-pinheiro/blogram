import { type NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [],
  serverExternalPackages: ['@ffprobe-installer/ffprobe'],
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/.pnpm/@ffprobe-installer+*/node_modules/@ffprobe-installer/**'],
  },
}

export default nextConfig
