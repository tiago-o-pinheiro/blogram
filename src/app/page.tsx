import { PageShell } from '@/components/page-shell'
import { UserMenu } from '@/features/auth/components/user-menu'
import { HealthStatus } from '@/features/health/components/health-status'

const Page = () => (
  <PageShell title="Blogram" description="Your app is running. Start building from here.">
    <UserMenu />
    <HealthStatus />
  </PageShell>
)

export default Page
