# Blogram

A self-hosted, open source multimedia journal for one owner. Publish photos, uploaded videos, YouTube videos, links and news to a public chronological feed. Visitors can filter, like and share without an account. English and Spanish interfaces, private drafts, editable profile, optimized images and downloadable vertical share cards are included.

Blogram uses Next.js, React, TypeScript, TypeBox, Drizzle, PostgreSQL, Better Auth and a token-based shadcn design system. There is no public registration, paid service requirement, follower system or comment system. Licensed under [MIT](LICENSE).

## Requirements

- Node.js 24 and pnpm 10.34.7 (Corepack can supply pnpm).
- PostgreSQL 17; Docker Compose starts a local development database automatically.
- FFmpeg with `ffprobe` on `PATH` for uploaded video inspection. Docker includes it. On macOS: `brew install ffmpeg`; on Debian/Ubuntu: `apt-get install ffmpeg`.
- Persistent object storage: a local disk volume or an S3-compatible bucket (Cloudflare R2, MinIO or AWS S3).
- A domain and HTTPS reverse proxy for production. Google OAuth credentials are optional.

## Start locally

```sh
cp .env.example .env
corepack enable
pnpm install
```

Edit `.env`: set a random `BETTER_AUTH_SECRET` (at least 32 characters) and your own `SETUP_PASSWORD` (at least 12 characters). For example, `openssl rand -hex 32` generates a secret. Keep these values private and use different values for each installation.

```sh
pnpm dev
```

The development preflight starts Docker PostgreSQL when `DATABASE_URL` points to localhost, waits for it and applies migrations. For an external database it applies migrations without starting Docker. Open [localhost:3000/admin](http://localhost:3000/admin), unlock the wizard with `SETUP_PASSWORD`, add your public profile and owner account, then finalize. Owner credentials accept an email address or a username. The owner's usual password is independent of `SETUP_PASSWORD`: it needs at least 1 character and at most 128, so longer is safer, while `SETUP_PASSWORD` keeps its 12-character minimum.

The installation state is stored in PostgreSQL. Finalization atomically creates one owner and locks the wizard, including across restarts. Remove `SETUP_PASSWORD` from the server environment afterward; it never becomes a login or recovery password. If setup is interrupted before finalization, use the same setup password to resume.

## Configuration

All application environment values are parsed in `src/server/config/env.ts`. `.env.example` lists available settings without production secrets.

| Variable                                   | Purpose                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL connection string                                                                   |
| `BETTER_AUTH_SECRET`                       | Unique, stable secret of at least 32 characters; development default is rejected in production |
| `BETTER_AUTH_URL`                          | Canonical site origin, such as `https://journal.example.com`                                   |
| `CORS_ORIGIN`                              | Same canonical site origin, trusted for authentication                                         |
| `SETUP_PASSWORD`                           | Server-only installer unlock, used only until finalization                                     |
| `STORAGE_DRIVER`                           | `local` or `s3`                                                                                |
| `STORAGE_LOCAL_DIR`                        | Persistent local media directory; default `.data/uploads`                                      |
| `UPLOAD_MAX_IMAGE_BYTES`                   | Image input limit, default 10 MiB                                                              |
| `UPLOAD_MAX_IMAGE_PIXELS`                  | Decoded image pixel limit, default 50 million                                                  |
| `UPLOAD_MAX_VIDEO_BYTES`                   | Video input limit, default 256 MiB; maximum 2 GiB minus one byte                               |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google OAuth web application credentials; supply both or neither                      |

For S3, also configure `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and `S3_FORCE_PATH_STYLE`. R2 usually uses region `auto`; MinIO commonly needs path-style addressing. Use a private bucket and credentials restricted to that bucket's object read/write/delete operations. Blogram serves authorized media through its own routes so unpublished content stays protected. Do not expose the local uploads directory as a public static folder. Preserve storage credentials across restarts and back up objects separately from the database.

Photos are validated, stripped of embedded metadata and re-encoded into variants. Uploaded MP4/WebM videos are inspected by `ffprobe` and require a separately uploaded poster image; ensure your reverse proxy request size and timeout accommodate the configured upload limit. Upload processing buffers a file in memory, so size limits should match your server resources. Uploaded video playback uses browser controls and HTTP range requests. Videos are not transcoded into adaptive streams; browser codec support still applies.

## Optional Google access

1. Create an OAuth client of type **Web application** in Google Cloud, configure the consent screen and add test users if the project is in testing mode.
2. Register the authorized redirect URI exactly: `https://YOUR_DOMAIN/api/auth/callback/google`. Development uses `http://localhost:3000/api/auth/callback/google`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, confirm `BETTER_AUTH_URL` and `CORS_ORIGIN`, and restart Blogram.
4. Sign in with the owner's password, open `/admin/account`, and select **Link Google**. Complete Google's consent flow. Linking and unlinking require a session created within the last five minutes; sign out and sign in again if requested.

Only an explicitly linked Google subject can sign in. A matching email does not automatically link a Google account, and Google cannot create another owner even when signup is explicitly requested. Explicit linking permits a different Google email so username-based owners can also use it. Password access remains available, and its credential account cannot be unlinked. To change Google identity, unlink it from a recent session and link the new identity. Without OAuth credentials the settings show configuration instructions and no activation button.

Provider restriction tests supply verified provider profiles to Better Auth and exercise its real handlers with the test database. They do not contact Google or prove a real consent-screen round trip. A live OAuth round trip requires your own client credentials and callback domain.

## Database migrations

```sh
pnpm db:generate
pnpm db:migrate
```

Generate a migration only after changing a table schema; review and commit the generated SQL. Deployments apply committed migrations before starting the web service. Never reset the database during an update. The installation record, owner, sessions, profile, publications and counters are all persistent database records.

## Production deployment

The repository includes a Dockerfile and `docker-compose.production.yml`. The web container runs as the unprivileged `node` user; PostgreSQL is not published and the web port binds only to the host loopback interface. Put an HTTPS reverse proxy such as Caddy or nginx in front of `127.0.0.1:3000`, forwarding the original host and HTTPS scheme. Restrict access to the server and its `.env` file.

Copy `.env.example` to `.env`, replace the auth secret, set the setup password and canonical HTTPS origins. Add a random `POSTGRES_PASSWORD` to `.env` (hex characters avoid connection-string escaping). Compose uses its own internal database URL. Choose persistent local storage or configure a private S3 bucket.

```sh
docker compose -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.production.yml logs migrate web
```

The migration service waits for PostgreSQL, applies migrations and exits successfully before the web service starts. PostgreSQL and local uploads use separate named persistent volumes. For a non-Docker installation, provision PostgreSQL and FFmpeg, install dependencies, run `pnpm db:migrate`, `pnpm build`, then `pnpm start` under a process supervisor with environment values loaded. Next.js loads `.env` for the application.

Do not run `docker compose down --volumes` on a live installation: it deletes database and local media volumes. Storage on an ephemeral deployment filesystem will be lost; mount a persistent volume or use S3.

## Backups and restore

Back up **both** PostgreSQL and media. Keep an encrypted copy of the server configuration, especially `BETTER_AUTH_SECRET`, with restricted access. Retain multiple backups away from the application server and periodically test restoration into an isolated installation.

For a consistent Docker backup, stop writes while making both copies:

```sh
docker compose -f docker-compose.production.yml stop web
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U blogram -d blogram -Fc > blogram.dump
docker compose -f docker-compose.production.yml run --rm --no-deps -T web tar -czf - -C /app/.data/uploads . > uploads.tar.gz
docker compose -f docker-compose.production.yml start web
```

With S3, use your provider's versioning/backup tooling or copy all objects while the web service is stopped. A database-only backup cannot recover media. Restore into an empty PostgreSQL database with `pg_restore --no-owner --no-acl`, then restore the matching uploads archive into the uploads volume (as root if required, finishing with ownership `1000:1000`) or restore the S3 objects. Restore configuration, apply any new migrations, and start web. Keep the installation row intact so restore does not reopen setup. Exact restore commands depend on the target database and volume names; verify the backup in isolation before replacing production data.

## Owner access recovery

An administrator with database/server access can reset the owner's password locally without reopening setup:

```sh
node scripts/recover-owner.mjs
```

For Docker:

```sh
docker compose -f docker-compose.production.yml exec web node scripts/recover-owner.mjs
```

The interactive command asks for the database connection URL, new password (1 to 128 characters) and confirmation with input hidden; enter the internal Compose connection URL when running in Docker. It then requires typing `RESET`. Do not paste secrets into command arguments or shell history. The command requires an already completed installation, hashes the password using Better Auth, updates or restores the credential account in a transaction and revokes every owner session. The existing Google link, profile and publications stay intact. Sign in again using the owner's existing email or username and the new password. `SETUP_PASSWORD` is never involved. Back up the database before recovery and protect server access, since database administrators can control the installation.

## Updates

Take a matching database and storage backup first, review release notes and migrations, then update source/dependencies using the lockfile and rebuild. Stop web during migrations:

```sh
docker compose -f docker-compose.production.yml stop web
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml run --rm migrate
docker compose -f docker-compose.production.yml up -d web
```

Keep volumes, bucket contents and auth secret stable. A code rollback may require restoring the matching database backup if a migration is incompatible. Never delete installation state to update or recover access.

## Development and verification

```sh
pnpm check
pnpm build
```

`node scripts/check.mjs --full` runs typecheck, lint, specs and production build. Specs use isolated migrated PGlite databases and temporary local storage. See `AGENTS.md`, `CLAUDE.md` and `docs/conventions/` before contributing. Feature specs sit next to their source files.

The Docker build, provider-specific S3 operations, reverse-proxy configuration and real Google OAuth require verification in your own deployment environment. Do not treat local automated specs as proof of those external integrations.

## Known limits

- Anonymous likes use a persisted atomic server counter and a browser-local marker. Clearing localStorage, private browsing or another device permits another like. They are not unique-person votes; likes cannot be removed in this release.
- YouTube playback and third-party previews depend on those services. Metadata fetching may fail; title, description and cover remain editable manually.
- Share cards for videos are static images. Native sharing depends on the device/browser; download/copy alternatives are provided. Blogram does not directly publish WhatsApp statuses or social stories.
- One owner and one media item per photo/video post. No streaming infrastructure, comments, public signup or social graph.
