import { type Models } from '@/models'

export class HealthService {
  getStatus = (): Models.Health => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
}

export const healthService = new HealthService()
