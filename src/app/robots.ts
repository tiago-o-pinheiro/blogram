import { type MetadataRoute } from 'next'

import { env } from '@/server/config/env'

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/admin', '/sign-in', '/api/admin', '/api/setup', '/api/auth', '/api/me'],
  },
  sitemap: `${new URL(env.BETTER_AUTH_URL).origin}/sitemap.xml`,
})

export default robots
