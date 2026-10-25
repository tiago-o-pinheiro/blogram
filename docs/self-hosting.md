# Self-hosting Blogram

Everything you need to run Blogram on your own server. For writing and publishing, see [Using Blogram](using-blogram.md).

You need a domain with HTTPS, a PostgreSQL 17 database and somewhere to keep uploads (a local volume or a private S3-compatible bucket). Uploads are buffered in memory, so size your upload limits to your RAM.

## Configuration

Configuration is parsed in `src/server/config/env.ts`. Keep secrets on the server and keep the public origins consistent. Generate secrets yourself with `openssl rand -hex 32` and never reuse them between installations.

| Variable                  | Default / requirement       | Purpose                                                                                            |
| ------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Local PostgreSQL sample URL | Database connection; production Compose overrides it inside containers                             |
| `BETTER_AUTH_SECRET`      | Development sample          | Unique stable secret, at least 32 characters; sample rejected in production                        |
| `BETTER_AUTH_URL`         | `http://localhost:3000`     | Public application and auth origin; HTTPS in production                                            |
| `CORS_ORIGIN`             | `http://localhost:3000`     | Trusted auth origins, comma-separated; include every public domain                                 |
| `SETUP_PASSWORD`          | Unset                       | Installer password, at least 12 characters; remove after setup                                     |
| `STORAGE_DRIVER`          | `local`                     | `local` or `s3`                                                                                    |
| `STORAGE_LOCAL_DIR`       | `.data/uploads`             | Persistent media directory; use an absolute path for a service                                     |
| `UPLOAD_MAX_IMAGE_BYTES`  | `10485760`                  | 10 MiB per image, profile photo or poster                                                          |
| `UPLOAD_MAX_IMAGE_PIXELS` | `50000000`                  | Decoded image pixel cap                                                                            |
| `UPLOAD_MAX_VIDEO_BYTES`  | `268435456`                 | 256 MiB per video; positive integer up to `2147483647`                                             |
| `S3_ENDPOINT`             | Unset                       | S3 API origin, required for S3                                                                     |
| `S3_REGION`               | `auto`                      | Provider signing region                                                                            |
| `S3_BUCKET`               | Unset                       | Private bucket name                                                                                |
| `S3_ACCESS_KEY_ID`        | Unset                       | Server access key                                                                                  |
| `S3_SECRET_ACCESS_KEY`    | Unset                       | Server secret key                                                                                  |
| `S3_FORCE_PATH_STYLE`     | `true`                      | Path-style addressing; `false` uses the bucket subdomain                                           |
| `GOOGLE_CLIENT_ID`        | Unset                       | Optional override of Account > Security; set together with the secret                              |
| `GOOGLE_CLIENT_SECRET`    | Unset                       | Optional override secret; when both are set the Account block is read-only                         |
| `NODE_ENV`                | Set by Next and scripts     | `production` enables secure cookies and auth rate limiting                                         |
| `POSTGRES_PASSWORD`       | Production Compose only     | Required database password; use hex characters                                                     |
| `DB_PORT`                 | Dev Compose: `5432`         | Host port of the development database; keep equal to the port in the URL                           |
| `PORT`                    | `3000`                      | Port used by `pnpm start`                                                                          |
| `BLOGRAM_VERSION`         | `latest`                    | Image tag used by production Compose: `latest`, a release such as `1.2.3`, or `sha-<short commit>` |

Leave unused S3 assignments commented out, as in `.env.example`: empty strings are invalid. Set both Google values or neither; when set, they override the Google settings saved in Account > Security. `BETTER_AUTH_SECRET` always stays in the environment: it also encrypts the Google client secret stored in the database.

## Railway and Cloudflare R2

Railway runs the app and PostgreSQL; a private Cloudflare R2 bucket stores media through the S3 driver.

1. In Cloudflare, open **Storage & databases → R2**, create a bucket such as `blogram-media` and keep public access off.
2. Create an R2 API token with **Object Read & Write** limited to that bucket. Save the Access Key ID, Secret Access Key (shown once) and the S3 API endpoint exactly as Cloudflare shows them. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/) for costs.
3. In Railway, create a project from the [GitHub repository](https://github.com/tiago-o-pinheiro/blogram) and add a PostgreSQL service. `railway.json` selects the Dockerfile, runs `pnpm db:migrate` as the pre-deploy command and checks `/api/health`. No forced `PORT` is needed.
4. Under **Settings → Networking**, generate a public domain.
5. Set these variables in the web service:

   ```dotenv
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   BETTER_AUTH_SECRET=<new-random-stable-secret>
   BETTER_AUTH_URL=https://<your-domain>.up.railway.app
   CORS_ORIGIN=https://<your-domain>.up.railway.app
   SETUP_PASSWORD=<random-installer-password>
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=blogram-media
   S3_ACCESS_KEY_ID=<r2-access-key-id>
   S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
   S3_FORCE_PATH_STYLE=true
   ```

   Use the reference picker for `DATABASE_URL` (`Postgres` must match your database service name). Keep credentials in Railway variables only.

6. Deploy, open `https://<your-domain>/admin` and finish the wizard. Then remove `SETUP_PASSWORD` and redeploy. Keep `BETTER_AUTH_SECRET` the same.

Browsers talk to Blogram, and Blogram talks to R2, so no public bucket URL or bucket CORS is needed. Files added directly in the bucket dashboard do not create posts.

To bring local content along, restore your database backup (see [Backup and restore](#backup-and-restore)) and copy the media tree into the bucket with the same keys:

```sh
aws --profile blogram-r2 --endpoint-url https://<account-id>.r2.cloudflarestorage.com s3 sync .data/uploads/ s3://blogram-media/
```

Stop writers during the final copy and keep both backups. Changing `STORAGE_DRIVER` alone never moves files.

## Docker Compose

`docker-compose.production.yml` runs PostgreSQL 17, a one-shot `migrate` service and the `web` container. Web waits for `migrate` to finish and binds only to `127.0.0.1:3000`; PostgreSQL is not published.

1. Install Docker with Compose v2, clone the repository and create `.env`:

   ```dotenv
   POSTGRES_PASSWORD=<random-hex-password>
   BETTER_AUTH_SECRET=<random-stable-secret>
   BETTER_AUTH_URL=https://journal.example.com
   CORS_ORIGIN=https://journal.example.com
   SETUP_PASSWORD=<random-installer-password>
   STORAGE_DRIVER=local
   ```

   Compose sets `DATABASE_URL` and the media path itself. Add the S3 values from [Configuration](#configuration) if you use a bucket.

2. Validate, pull the published image and start:

   ```sh
   docker compose -f docker-compose.production.yml config --quiet
   docker compose -f docker-compose.production.yml pull
   docker compose -f docker-compose.production.yml up -d
   ```

   The image is `ghcr.io/tiago-o-pinheiro/blogram`. Pin a release with `BLOGRAM_VERSION`. To build from source instead (for example on arm64), run `docker compose -f docker-compose.production.yml up --build -d`. The GHCR package must be public for `pull` to work without logging in.

3. Check the result. `migrate` exiting with code 0 is expected.

   ```sh
   docker compose -f docker-compose.production.yml ps -a
   docker compose -f docker-compose.production.yml logs --tail=100 migrate web
   curl http://127.0.0.1:3000/api/health
   ```

4. Put [HTTPS](#https-with-nginx) in front, open `/admin` and finish the wizard.
5. Remove `SETUP_PASSWORD` from `.env` and recreate web, since a plain `restart` does not reload environment values:

   ```sh
   docker compose -f docker-compose.production.yml up -d --no-deps --force-recreate web
   ```

Keep the volumes, the project name and the auth secret. Never run `down --volumes` on a live installation.

## Node without Docker

1. Provision PostgreSQL 17, Node 24, pnpm and FFmpeg with `ffprobe` on `PATH`. Create a service user and a persistent writable media directory.
2. Set production HTTPS origins, a stable secret and the database URL in the service environment.
3. Install, migrate, build and start:

   ```sh
   pnpm install --frozen-lockfile
   pnpm db:migrate
   pnpm build
   pnpm start
   ```

4. Run `pnpm start` under a supervisor with the right working directory and environment, and put [HTTPS](#https-with-nginx) in front. Set `PORT` to change the listening port.

Never use `pnpm dev` in production.

## HTTPS with nginx

Production owner cookies are secure, so the site must be served over HTTPS and the public origin must match `BETTER_AUTH_URL`. Example after obtaining a certificate:

```nginx
server {
    listen 80;
    server_name journal.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name journal.example.com;
    ssl_certificate /etc/letsencrypt/live/journal.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/journal.example.com/privkey.pem;
    client_max_body_size 280m;
    client_body_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

- The 280 MiB body limit fits the default 256 MiB video, a 10 MiB poster and overhead. Raise it if you raise the upload limits.
- Make the edge replace client-IP forwarding headers, as above.
- Do not override the app's cache headers or range responses at a proxy or CDN.
- Run `sudo nginx -t` before reloading.

## Storage

Postgres holds the installation, owner, sessions, profile, posts, media references, likes and the cleanup queue. Media bytes live in a local directory or a private S3 bucket. A database backup cannot restore media and a media backup cannot restore posts.

- **Local:** development uses `.data/uploads`. Production Compose mounts the `uploads` volume at `/app/.data/uploads`. The container runs as UID/GID 1000, so restore files with matching ownership.
- **S3, R2 or MinIO:** create a private bucket and set `S3_ENDPOINT` to the API origin only (no bucket or path). Credentials need object read, write and delete. The bucket stays private because the app checks draft visibility before reading.
- **Switching drivers:** copy objects with their exact keys, take a matching backup and switch during maintenance.

Images are decoded, re-encoded and stripped of EXIF and GPS data. Videos are inspected with `ffprobe`; MP4 with H.264 is the safest format for browsers. There is no transcoding.

Replaced or deleted media go into a persistent `media_cleanup` queue in the same transaction as the post change. Failed deletes keep their keys and are retried in batches of 25 by later media operations. The owner can also call `POST /api/admin/media-cleanup`, which returns `{deleted, pending}`. Include this table in backups.

## Google sign-in

Optional. Password sign-in always works.

1. Create a Google OAuth **Web application** client. In testing mode, add the owner as a test user.
2. Register `https://<your-domain>/api/auth/callback/google` as the redirect URI. The Account page shows the exact value; locally it is `http://localhost:3000/api/auth/callback/google`.
3. Sign in with your password and open `/admin/account?section=security`. Copy the redirect URI shown in the Google block.
4. Turn the switch on, paste the Client ID and Client Secret, and save. No restart is needed.
5. Choose **Link Google**. Linking needs a session younger than five minutes.

The saved secret is encrypted with `BETTER_AUTH_SECRET`. Rotating `BETTER_AUTH_SECRET` makes it unreadable, so Google sign-in turns off until you enter the secret again.

Alternatively, set both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the environment. They win over saved settings and the Account block becomes read-only; remove both to manage Google there again.

Google cannot create users and a matching email never links an account. Only the explicitly linked Google identity can sign in. The password cannot be unlinked.

## Updating

Back up first (see [Backup and restore](#backup-and-restore)) and keep `.env`, the project name and the volumes.

1. Docker Compose with the published image:

   ```sh
   docker compose -f docker-compose.production.yml pull
   docker compose -f docker-compose.production.yml up -d
   docker compose -f docker-compose.production.yml logs --tail=100 migrate web
   ```

   When building from source, fetch the new revision and use `up --build -d` instead of `pull`.

2. Railway redeploys on push and runs migrations in `preDeployCommand`.
3. Node: stop the supervisor, run `pnpm install --frozen-lockfile`, `pnpm db:migrate` and `pnpm build`, restart and smoke-test.

Migrations are committed in `drizzle/`. If `migrate` fails, web does not start; fix it rather than deleting state. A rollback needs a compatible schema or a matching backup.

## Backup and restore

Back up PostgreSQL and matching media together, plus a protected copy of `.env` and the code revision. Stop writers while you take the pair. Keep several generations off the host and rehearse the restore.

Docker with local media:

```sh
mkdir -p backups
chmod 700 backups
docker compose -f docker-compose.production.yml stop web
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U blogram -d blogram -Fc > backups/blogram.dump
docker compose -f docker-compose.production.yml run --rm --no-deps -T web tar -czf - -C /app/.data/uploads . > backups/uploads.tar.gz
install -m 600 .env backups/environment.env
git rev-parse HEAD > backups/revision.txt
docker compose -f docker-compose.production.yml start web
```

Check that each command succeeded; an empty archive is not a backup. The copied `.env` holds secrets, so encrypt it before moving it and never commit `backups/`. For S3, use provider versioning or copy every object key while writers are stopped.

Restore drill, in a separate checkout at the backed-up revision with a new project name and empty volumes:

```sh
install -m 600 backups/environment.env .env
docker compose -p blogram-restore -f docker-compose.production.yml build
docker compose -p blogram-restore -f docker-compose.production.yml up -d --wait postgres
docker compose -p blogram-restore -f docker-compose.production.yml exec -T postgres pg_restore -U blogram -d blogram --no-owner --no-acl --exit-on-error < backups/blogram.dump
docker compose -p blogram-restore -f docker-compose.production.yml run --rm --no-deps --user root -T web sh -c 'mkdir -p /app/.data/uploads && tar -xzf - -C /app/.data/uploads && chown -R 1000:1000 /app/.data/uploads' < backups/uploads.tar.gz
docker compose -p blogram-restore -f docker-compose.production.yml run --rm --no-deps migrate
```

Check the data:

```sh
docker compose -p blogram-restore -f docker-compose.production.yml exec -T postgres psql -U blogram -d blogram -c 'SELECT status, completed_at FROM installation; SELECT count(*) AS posts FROM post; SELECT count(*) AS media FROM media;'
```

Try the restored site on a spare port without touching production volumes:

```sh
docker compose -p blogram-restore -f docker-compose.production.yml run --rm --no-deps -p 127.0.0.1:3100:3000 -e BETTER_AUTH_URL=http://localhost:3100 -e CORS_ORIGIN=http://localhost:3100 web
```

For S3, restore into an isolated private bucket and never test deletes against the production one. Stop the test container afterward.

## Recover owner access

With server access you can reset the owner's password without reopening setup:

```sh
node scripts/recover-owner.mjs
```

In Docker:

```sh
docker compose -f docker-compose.production.yml exec web node scripts/recover-owner.mjs
```

Use an interactive terminal. The prompts hide the database URL, new password and confirmation, then ask you to type `RESET`. Inside Compose the URL is `postgresql://blogram:<POSTGRES_PASSWORD>@postgres:5432/blogram`. Recovery needs a completed installation, revokes all owner sessions and keeps your profile, posts and Google link. Back up before running it.

To look up a forgotten identifier without reading hashes:

```sh
docker compose -f docker-compose.production.yml exec -T postgres psql -U blogram -d blogram -c 'SELECT username, email FROM "user";'
```

Username-only accounts have an internal `@owner.invalid` email; sign in with the username.

## Troubleshooting

| Symptom                              | Check / action                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Setup not configured                 | Set `SETUP_PASSWORD` to at least 12 characters, recreate web, reload `/admin`                                                       |
| Wrong setup password                 | Use the installer password, not the owner login; check for stray spaces or quotes                                                   |
| Setup 429                            | Honor `Retry-After`; the guard uses a 15-minute budget                                                                              |
| Wizard closed after installation     | Expected: use `/sign-in` with the owner credentials                                                                                 |
| Site looks newly installed           | Confirm the original database, project name and volumes before starting another setup                                               |
| Production build rejects auth secret | Replace the development sample secret                                                                                               |
| Compose missing database password    | Set `POSTGRES_PASSWORD` before starting                                                                                             |
| Database auth fails                  | Check the URL, port and original password; env changes do not change an initialized role password                                   |
| Deploy healthcheck fails             | `/api/health` queries the database and returns 503 when it is down; check `DATABASE_URL` and the database service                   |
| `.env` change ineffective            | Restart Node; recreate Compose containers                                                                                           |
| Login fails behind proxy             | Check HTTPS, forwarded host and scheme, and the auth origins                                                                        |
| Upload 413                           | Check app and proxy limits; a video request also carries its poster                                                                 |
| Image 422                            | Check real JPEG, PNG or WebP bytes, decoded pixels and file size                                                                    |
| Video unavailable                    | Ensure `ffprobe` is on the service `PATH`; Docker includes it                                                                       |
| Accepted video will not play         | Check browser codecs and proxy range handling; try H.264 MP4                                                                        |
| Blank link preview                   | The target may be blocked, private, slow or too large; enter metadata by hand                                                       |
| S3 failures                          | Check the API origin, bucket, region, addressing and read/write/delete permissions                                                  |
| Old bytes after storage outage       | Restore provider access and retry cleanup; queued keys stay in PostgreSQL                                                           |
| Google button absent                 | Save the Client ID and Secret in Account > Security and turn the switch on; re-enter the secret after rotating `BETTER_AUTH_SECRET` |
| Google callback fails                | Match the exact callback and public origin; check consent and test-user settings                                                    |
| Google linking asks to sign in again | A session younger than five minutes is required                                                                                     |

Production logs: `docker compose -f docker-compose.production.yml logs --tail=100 web migrate`. Share sanitized errors only, never environment dumps, cookies, tokens or database URLs.
