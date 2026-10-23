import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_URL = 'postgresql://postgres:postgres@localhost:5432/app'
const LOCAL = ['localhost', '127.0.0.1', '[::1]']
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => {
  process.stderr.write(`dev-preflight: ${msg}\n`)
  process.exit(1)
}
const fromDotenv = (file) => {
  if (!existsSync(file)) {
    return undefined
  }
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='))
  return line?.slice(13).replace(/^["']|["']$/g, '')
}
const run = (cmd, args, env, cwd) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, cwd })
  if (r.error || r.status !== 0) {
    fail(`"${[cmd, ...args].join(' ')}" failed`)
  }
}
const databaseUrl =
  process.env.DATABASE_URL ?? fromDotenv(join(process.cwd(), '.env')) ?? DEFAULT_URL
const url = new URL(databaseUrl)
const env = { ...process.env, DATABASE_URL: databaseUrl, DB_PORT: url.port || '5432' }
if (LOCAL.includes(url.hostname)) {
  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
    fail('Docker is not running. Start Docker and retry.')
  }
  run('docker', ['compose', 'up', '-d', '--wait'], env, rootDir)
}
const [cmd, ...args] = process.argv.slice(2)
if (cmd) {
  run(cmd, args, env, process.cwd())
}
