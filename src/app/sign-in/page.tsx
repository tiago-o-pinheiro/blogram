import { PageShell } from '@/components/page-shell'
import { SignInForm } from '@/features/auth/components/sign-in-form'

const Page = () => (
  <PageShell title="Sign in" description="Welcome back.">
    <SignInForm />
  </PageShell>
)

export default Page
