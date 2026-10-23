import { PageShell } from '@/components/page-shell'
import { SignUpForm } from '@/features/auth/components/sign-up-form'

const Page = () => (
  <PageShell title="Sign up" description="Create your account.">
    <SignUpForm />
  </PageShell>
)

export default Page
