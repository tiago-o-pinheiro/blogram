import { spawnSync } from 'node:child_process'

const run = (command, args, extraEnv = {}) => {
  const { status } = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  })
  if (status !== 0) {
    process.exit(status ?? 1)
  }
}

if (process.env.VERCEL_ENV === 'production') {
  run('pnpm', ['db:migrate'])
}

run('pnpm', ['build'])
