# Blogram

A personal multimedia journal you install on your own server and domain. One owner publishes; everyone else can read, filter, like and share without creating an account.

Blogram supports photos, uploaded videos, YouTube, links and news. It is one Next.js application with PostgreSQL, Drizzle, Better Auth, TypeBox, React and a shadcn-based design system. Interfaces are available in English and Spanish. Licensed under [MIT](LICENSE).

## Contents

- [Current project state](#current-project-state)
- [Requirements](#requirements)
- [Local installation](#local-installation)
- [First-run wizard](#first-run-wizard)
- [Using the journal](#using-the-journal)
- [Configuration reference](#configuration-reference)
- [Storage and media](#storage-and-media)
- [Railway with Cloudflare R2](#railway-with-cloudflare-r2)
- [Production with Docker Compose](#production-with-docker-compose)
- [HTTPS reverse proxy](#https-reverse-proxy)
- [Production without Docker](#production-without-docker)
- [Optional Google sign-in](#optional-google-sign-in)
- [Migrations and updates](#migrations-and-updates)
- [Backup and restore](#backup-and-restore)
- [Owner access recovery](#owner-access-recovery)
- [Troubleshooting](#troubleshooting)
- [Development and verification](#development-and-verification)
- [Architecture](#architecture)
- [Limits and operational assumptions](#limits-and-operational-assumptions)

## Current project state

The core application is implemented. It is not just a visual prototype.

| Area           | Available behavior                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Installation   | Protected, resumable wizard; persistent installation state; one owner; wizard locks after completion   |
| Authentication | Email or username and password; cookie sessions; logout; password changes; server-side recovery        |
| Profile        | Name, description, photo, live preview and default language                                            |
| Publishing     | Draft, preview, publish, edit, unpublish and confirmed deletion                                        |
| Post types     | Photo; uploaded MP4/WebM with poster; YouTube URL; link; news                                          |
| Public feed    | Newest first; URL-based filters; pagination; permanent pages; mobile/desktop layouts                   |
| Likes          | Atomic backend counter; browser-local remembered state; no public accounts                             |
| Sharing        | Copy link; native share where supported; 1080×1920 story cards; 1200×630 Open Graph images             |
| Media          | Real image/video validation; image variants; photo metadata removal; private drafts; video byte ranges |
| Google         | Optional explicit linking; only the linked identity can sign in; password access retained              |
| Self-hosting   | Dockerfile, persistent Compose deployment, migrations and recovery command                             |

See [the project audit](docs/PROJECT_STATUS.md) for verified fixes, remaining validation and deliberate limitations. Live Google OAuth, a real S3/R2 account, DNS and HTTPS must still be verified with each installation's credentials and domain. Automated tests do not substitute for those checks.

There are intentionally no followers, comments, private messages, public registration, multiple owners, SaaS tenancy, recommendations or AI features.

## Requirements

For development or a direct Node deployment:

- Node.js **24**, matching `.nvmrc`. The package declares Node 22 or newer; 24 is the documented and Docker-tested version.
- pnpm **10.34.7**, matching `packageManager` in `package.json`.
- PostgreSQL **17**.
- FFmpeg with **`ffprobe` on PATH** for uploaded video validation.
- Docker Engine/Desktop with Compose v2 for the automatic development database or production Compose deployment.
- Persistent local storage or a private S3-compatible bucket.

Production also needs a domain, DNS, HTTPS termination and enough RAM/disk for your upload limits. Processing buffers files in memory: the maximum is a real resource budget. Videos are not converted into adaptive streams.

The production container includes Node, pnpm, FFmpeg and dependencies. Host Node/pnpm/FFmpeg are unnecessary if you use only Docker.

## Local installation

### 1. Obtain source and dependencies

```sh
git clone https://github.com/tiago-o-pinheiro/blogram.git
cd blogram
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
```

For an existing checkout, keep its `.env` instead of overwriting it. Do not reset a database or delete `.data` to update the app.

Install FFmpeg if necessary, using the command for your OS:

```sh
brew install ffmpeg
```

On Debian/Ubuntu:

```sh
sudo apt-get update
sudo apt-get install --yes ffmpeg
```

Check `node --version`, `pnpm --version`, `docker compose version` and `ffprobe -version` in the shell that will launch Blogram.

### 2. Configure `.env`

Generate independent values; do not copy secrets from documentation or another installation:

```sh
openssl rand -hex 32
openssl rand -hex 24
```

Use the first generated value for `BETTER_AUTH_SECRET` and the second for `SETUP_PASSWORD`. Keep them private.

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
BETTER_AUTH_SECRET=<your-generated-stable-auth-secret>
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
SETUP_PASSWORD=<your-generated-installer-password>
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=.data/uploads
```

Angle-bracket values are placeholders, not usable settings. The installer password needs at least 12 characters. The owner's password, chosen later, is separate and accepts 1–128 characters. Inputs include show/hide controls.

`.env` is ignored by Git and excluded from Docker build context. On Unix, restrict it with `chmod 600 .env`.

### 3. Start

Start Docker Desktop/Engine, then:

```sh
pnpm dev
```

Preflight starts the repository's local PostgreSQL container, waits for health, applies committed migrations, then starts Next.js. A non-local `DATABASE_URL` skips Docker startup and uses the specified database.

Open [localhost:3000](http://localhost:3000) for the public site and [localhost:3000/admin](http://localhost:3000/admin) for setup/owner access. Keep the terminal running. Ctrl+C stops web; the database container and persistent volume remain.

If port 5432 is occupied, change the URL to, for example, `localhost:5433/app`; preflight derives the development database mapping from that port. For an independently managed local database, start it yourself, run `pnpm db:migrate`, then `pnpm exec next dev --port 3000`: the regular local preflight assumes it manages the repository's Compose database.

Package scripts explicitly select web port 3000. Changing `PORT` alone does not override those flags. If using another launch port, change both auth/canonical origins to match.

## First-run wizard

Before installation, the public home is a neutral pending page.

1. Open `/admin` and enter `SETUP_PASSWORD`. Backend validation grants only a temporary installer session.
2. Set the public name and optional description. Select/preview a JPEG, PNG or WebP photo using the photo button. A profile photo is optional.
3. Choose the private owner's email or username, password and confirmation. Usernames use 3–32 letters, numbers, dots, dashes or underscores.
4. Review your profile/account identifier, then finish.

Completion persists one owner and installation state, revokes installer sessions, starts a normal owner session and opens administration. Restarting/updating never reopens setup. Competing finalizations cannot create two owners.

If interrupted, unlock again with the same installer password. The saved profile persists; unsaved file selections and unsubmitted owner credentials do not. Closing the browser does not consume the installer password.

After completion, remove `SETUP_PASSWORD` and restart/recreate web. It never becomes a login/recovery credential. Keep `BETTER_AUTH_SECRET` stable across restarts and updates.

An existing owner combined with pending installation indicates inconsistent/imported data. Back up and inspect its history before changing anything; do not automatically erase accounts or bypass the one-owner guard.

## Using the journal

### Owner routes

| Route                       | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `/admin`                    | Installer before setup; owner administration afterward |
| `/sign-in`                  | Normal email/username/password sign-in                 |
| `/admin/posts`              | Paginated posts with type, status, date and likes      |
| `/admin/posts/new`          | Type-specific creation form                            |
| `/admin/posts/<id>`         | Edit/replace media                                     |
| `/admin/posts/<id>/preview` | Preview, publish, unpublish or delete                  |
| `/admin/profile`            | Public identity and default language                   |
| `/admin/account`            | Password change and Google linking                     |

Save a draft, preview, then publish. Draft files/pages require owner access. Unpublishing hides content/files from public routes. Media caches must revalidate; do not override application cache headers at a proxy/CDN.

### Content types

| Type           | Inputs and behavior                                                                           |
| -------------- | --------------------------------------------------------------------------------------------- |
| Photo          | One JPEG/PNG/WebP image, editable alternative text, optional caption, original aspect ratio   |
| Uploaded video | MP4/WebM plus a separate poster and optional caption; native controls; vertical video allowed |
| YouTube        | Supported URL normalized to a video ID; click-to-play embed; no YouTube file download         |
| Link           | HTTP(S) URL, title, optional description/source/cover and personal caption                    |
| News           | Link-like fields with visible news classification and original source                         |

YouTube accepts `/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/embed/…` and `/live/…` variants on supported hosts. Arbitrary embed HTML is refused.

For links/news, fetch text metadata if desired, then edit it. A failed preview never prevents manual publication. Covers are uploaded manually; full article text is not copied. Fetching restricts addresses, redirects, response size and total time, including DNS.

### Public browsing/sharing

### Attach a place

In the post editor, choose **Add a place**, then enter a city, venue or other place name. The place appears below the media in previews and published posts. It is optional for every post type, can be edited later, and **Remove place** clears it when you save.

Choose **Find on OpenStreetMap** to search in a new tab. For an exact location, use OpenStreetMap's Share control and paste the full `https://www.openstreetmap.org/...` link into the optional map-link field. Without a map link, the published label opens an OpenStreetMap search for that name. This integration uses ordinary links: no geocoding API key, automatic location access, external search requests while typing, or map tiles are required. Place labels are public when the post is published.

Upgrading an existing installation requires `pnpm db:migrate`; migration `0005` adds a nullable place column and preserves existing posts. Railway runs migrations before deploying.

### Mobile navigation and account

The mobile bottom bar has four icon tabs: **Feed**, **New**, **Profile** and **Account**. Feed opens your posts, including drafts. Sign out is under **Account → Session**. The Account page also holds password and Google sign-in settings.

Filters use `/?type=photo`, `/?type=video`, `/?type=link` or `/?type=news`; video includes uploaded video and YouTube. Pagination preserves the filter, and `/posts/<id>` is the permanent URL.

Likes increment on the server. `post:<id>:liked` localStorage remembers a confirmed vote in that browser. There is no unlike or one-human-one-vote guarantee. Native sharing depends on the device/browser; copy and download are alternatives. Story cards are static, including videos. There is no direct publishing to WhatsApp statuses or social stories.

Locale resolution prefers a supported visitor locale cookie, then supported `Accept-Language`, then the owner's site default, finally English. This localizes the interface, not authored content.

## Configuration reference

Configuration is parsed in `src/server/config/env.ts`. Keep secrets on the server and origins consistent.

| Variable                  | Default / requirement       | Purpose                                                                     |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`            | Local PostgreSQL sample URL | Database; production Compose overrides it inside containers                 |
| `BETTER_AUTH_SECRET`      | Development sample          | Unique stable secret, at least 32 characters; sample rejected in production |
| `BETTER_AUTH_URL`         | `http://localhost:3000`     | Public application/auth origin; HTTPS in production                         |
| `CORS_ORIGIN`             | `http://localhost:3000`     | Trusted auth origins, comma-separated; include every public domain          |
| `SETUP_PASSWORD`          | Unset                       | At least 12 characters until setup; remove afterward                        |
| `STORAGE_DRIVER`          | `local`                     | `local` or `s3`                                                             |
| `STORAGE_LOCAL_DIR`       | `.data/uploads`             | Persistent media directory; absolute path recommended for a service         |
| `UPLOAD_MAX_IMAGE_BYTES`  | `10485760`                  | 10 MiB per image/profile photo/poster                                       |
| `UPLOAD_MAX_IMAGE_PIXELS` | `50000000`                  | Decoded image pixel cap                                                     |
| `UPLOAD_MAX_VIDEO_BYTES`  | `268435456`                 | 256 MiB per video; positive integer up to `2147483647`                      |
| `S3_ENDPOINT`             | Unset                       | S3 API origin, required for S3                                              |
| `S3_REGION`               | `auto`                      | Provider signing region                                                     |
| `S3_BUCKET`               | Unset                       | Private bucket name                                                         |
| `S3_ACCESS_KEY_ID`        | Unset                       | Server access key                                                           |
| `S3_SECRET_ACCESS_KEY`    | Unset                       | Server secret key                                                           |
| `S3_FORCE_PATH_STYLE`     | `true`                      | Path-style addressing; false uses bucket subdomain                          |
| `GOOGLE_CLIENT_ID`        | Unset/empty                 | Optional OAuth web client                                                   |
| `GOOGLE_CLIENT_SECRET`    | Unset/empty                 | Configure alongside client ID                                               |
| `NODE_ENV`                | Next/scripts                | Production enables secure cookies and auth rate limiting                    |
| `POSTGRES_PASSWORD`       | Production Compose only     | Required Compose database password                                          |
| `DB_PORT`                 | Dev Compose: `5432`         | Host database mapping; preflight derives it from the URL                    |

Leave unused optional S3 assignments commented as in `.env.example`: empty optional non-empty S3 strings are invalid. Set both Google values or neither.

## Storage and media

### Persistence

| Data                                                                                  | Location                                      |
| ------------------------------------------------------------------------------------- | --------------------------------------------- |
| Installation, owner, sessions, profile, posts, media references, likes, cleanup queue | PostgreSQL                                    |
| Re-encoded images, variants, posters and videos                                       | Local directory or private S3 objects         |
| Remembered anonymous votes                                                            | Visitor browser, separate from backend counts |

Do not store uploads in Git, public static directories or ephemeral deployment disks. A database-only backup cannot recover media bytes. A media-only backup cannot recover publications/accounts.

Local development uses `.data/uploads`. Production Compose mounts `uploads` at `/app/.data/uploads`. Direct Node services need a persistent directory writable by their service user. The container uses UID/GID 1000; restore files with compatible ownership. Changing Compose project names creates different named volumes.

### S3, Cloudflare R2 or MinIO

Create a private bucket. Supply its API origin, not a public website URL, object URL or endpoint already including a bucket/path:

```dotenv
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=blogram-media
S3_ACCESS_KEY_ID=<bucket-access-key>
S3_SECRET_ACCESS_KEY=<bucket-secret>
S3_FORCE_PATH_STYLE=true
```

For MinIO use its S3 API endpoint/region; path style is commonly appropriate. For AWS use the region-specific API endpoint/signing region. Verify addressing style and signed range reads with your provider.

Credentials need object read/write/delete permissions. Keep the bucket private: application routes enforce draft visibility before reading. Uploads pass through the server; public bucket/browser CORS access is not needed for that flow.

Changing drivers does not migrate files. First copy objects preserving their exact keys, take a matching backup, then switch configuration during maintenance. Database references do not contain file bytes.

### Processing, limits and deletion

Images are decoded, validated, oriented, re-encoded and stripped of embedded EXIF/GPS metadata. Variants preserve aspect ratio and do not upscale small images. Alternative text is editable.

`ffprobe` inspects videos with bounded execution and restricted input protocols. Supported combinations include H.264/HEVC/AV1 in MP4 and VP8/VP9/AV1 in WebM. Browser decoder support still varies; H.264 MP4 is a practical compatibility choice. There is no automatic video conversion, adaptive bitrate encoding or audio normalization.

Multipart bodies and individual files are bounded. A video body also includes its poster and overhead; proxy limits must exceed that sum. Pixel limits can reject a highly compressed image even when its file is small. Pick limits that fit your RAM.

Unused objects enter a persistent `media_cleanup` queue. Post replacement/deletion enqueues old keys in the same transaction as its data changes. Failed storage deletes retain keys/attempt counts for retry. Later media operations retry batches of up to 25; an authenticated owner can also call `POST /api/admin/media-cleanup`, which returns `{deleted, pending}`. No external queue or timer is required.

Restore provider connectivity/permissions before retrying. Bytes may remain privately stored while a delete is pending, but removed media references are not served publicly. Include the cleanup table in backups. Database and object storage do not share a distributed transaction; preserve backups and monitor failed operations.

## Railway with Cloudflare R2

Run the web application and PostgreSQL on Railway, and store media in a private Cloudflare R2 bucket. Uploads use the existing S3 driver; no additional upload integration is necessary.

### 1. Create the R2 bucket and credentials

1. In Cloudflare, open **Storage & databases → R2 → Overview**. Activate R2 if prompted; review its billing terms.
2. Create a bucket such as `blogram-media` with **Standard** storage. Keep public access disabled.
3. Under R2 API tokens, create credentials with **Object Read & Write**, restricted to this bucket.
4. Save the **Access Key ID**, **Secret Access Key** and **S3 API endpoint** privately. These are S3 credentials, not a generic Cloudflare bearer token. The secret is shown only once. Copy the exact endpoint Cloudflare supplies, including any jurisdiction-specific hostname.

As checked on 23 October 2026, R2 Standard includes **10 GB-month** of storage, one million Class A operations and ten million Class B operations per month, with free Internet egress. It is not a 20 GB free plan or a spending cap; usage beyond included allowances is billable. Generated image variants/posters also consume storage. Railway compute, PostgreSQL and network usage are separate from R2 pricing. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/) and [S3 setup](https://developers.cloudflare.com/r2/get-started/s3/).

### 2. Connect Railway

Create a Railway project and deploy the [GitHub repository](https://github.com/tiago-o-pinheiro/blogram). Add a PostgreSQL service to the same project. The committed `railway.json` selects the Dockerfile, runs `pnpm db:migrate` before deployment and checks `/api/health`; the container starts with `pnpm start`. Do not substitute `pnpm dev`.

In the web service, generate a public domain under **Settings → Networking**, with target port **3000**. Set `PORT=3000` because the package start command explicitly uses that port. The Dockerfile includes FFmpeg and binds Next.js to the container's interfaces.

### 3. Set web-service variables

Add these through Railway's Variables UI. Replace every placeholder before deploying:

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<new-random-stable-secret-at-least-32-characters>
BETTER_AUTH_URL=https://<your-generated-domain>.up.railway.app
CORS_ORIGIN=https://<your-generated-domain>.up.railway.app
SETUP_PASSWORD=<random-installer-password-at-least-12-characters>
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=blogram-media
S3_ACCESS_KEY_ID=<R2-access-key-id>
S3_SECRET_ACCESS_KEY=<R2-secret-access-key>
S3_FORCE_PATH_STYLE=true
```

Use Railway's variable reference picker for `DATABASE_URL`; `Postgres` must match the actual database service name. Use its internal `DATABASE_URL`, not localhost. Generate the auth secret and installer password separately with `openssl rand -hex 32`. Set the two origins to the exact HTTPS domain, without a path. For a jurisdictional R2 bucket, replace the example endpoint with the exact endpoint copied in step 1.

Keep credentials in Railway variables, never GitHub source, public frontend variables or screenshots. Leave optional Google credentials unset until configured. This S3 deployment needs no Railway upload volume. Do not use ephemeral container storage for journal media.

### 4. Deploy and upload

Deploy after configuring the database and variables. Confirm the pre-deploy migration succeeded, then open `https://<your-domain>/admin` and complete the wizard. Afterward remove `SETUP_PASSWORD` from Railway and redeploy, preserving the stable auth secret.

Choose images in **Profile** or **New post**, then save. Blogram validates/processes them and writes the objects to R2 automatically. The browser talks to Blogram; Blogram authenticates to R2 and serves media through its protected routes. No public bucket URL or bucket CORS configuration is required for this server-mediated flow. Files uploaded directly into the bucket dashboard do not create journal posts or database references.

Publish a photo and video, test seeking, confirm draft media stays private and redeploy once to verify persistence. `/api/health` checks responsiveness, not bucket access. This repository configuration is prepared for Railway; a live Railway/R2 deployment still requires your account credentials and verification.

### Existing local content

A GitHub push deploys code, not the local owner, database or uploads. A fresh Railway database starts a new wizard. To retain local publications, back up and restore the existing database, and copy the entire local media tree into R2 **with the same relative object keys** before directing the restored app to it. Merely changing `STORAGE_DRIVER` does not move files.

For example, after configuring a named AWS CLI profile privately with the R2 S3 credentials, copy local objects without deleting either source or destination:

```sh
aws --profile blogram-r2 --endpoint-url https://<account-id>.r2.cloudflarestorage.com s3 sync .data/uploads/ s3://blogram-media/
```

Use the actual configured local directory and exact R2 endpoint. Stop application writers during the final database/media snapshot and copy; retain the backups. Use the [backup and restore procedure](#backup-and-restore) for the database, adapting its PostgreSQL connection to Railway. A completed restored installation stays completed. Use a production-valid stable auth secret; changing it invalidates existing sessions, so sign in again. Verify representative restored photos, variants and videos before considering the migration complete.

Railway references: [Docker/configuration](https://docs.railway.com/config-as-code/reference), [pre-deploy migrations](https://docs.railway.com/deployments/pre-deploy-command), [PostgreSQL variables](https://docs.railway.com/databases/postgresql).

## Production with Docker Compose

The supplied single-server deployment uses PostgreSQL 17, an unprivileged web container, a one-shot migration service and separate persistent database/media volumes.

### 1. Prepare

Install Docker/Compose from an official distribution, obtain the source and create `.env`. Prepare DNS and HTTPS. Production web binds only to `127.0.0.1:3000`; PostgreSQL is not published.

Replace every placeholder below with independent generated values:

```dotenv
POSTGRES_PASSWORD=<random-hex-database-password>
BETTER_AUTH_SECRET=<random-stable-auth-secret-at-least-32-characters>
BETTER_AUTH_URL=https://journal.example.com
CORS_ORIGIN=https://journal.example.com
SETUP_PASSWORD=<random-installer-password-at-least-12-characters>
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/app/.data/uploads
UPLOAD_MAX_IMAGE_BYTES=10485760
UPLOAD_MAX_IMAGE_PIXELS=50000000
UPLOAD_MAX_VIDEO_BYTES=268435456
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Use hex/URL-safe characters for the database password because Compose interpolates it into a connection URL. Add S3 settings if using a bucket.

Production Compose overrides `DATABASE_URL` with its internal database service URL and the local media path with its volume mount. These override matching service `.env` names; see [Docker environment precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/).

Docker uses an ephemeral build-only auth secret. You still need a separate stable runtime `BETTER_AUTH_SECRET` in `.env`.

### 2. Build/start

```sh
docker compose -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.production.yml ps -a
docker compose -f docker-compose.production.yml logs --tail=100 migrate web
```

`config --quiet` avoids printing expanded secrets. Migration waits for PostgreSQL health, applies committed SQL and must succeed before web starts. `migrate` exiting with code 0 is expected; a nonzero exit is not.

Check `http://127.0.0.1:3000/api/health` from the server, configure HTTPS, then open `https://journal.example.com/admin`. Health only checks application responsiveness, not full database/bucket readiness. Test an authenticated upload, public post and video seek as well.

After setup, remove `SETUP_PASSWORD` and refresh container environment:

```sh
docker compose -f docker-compose.production.yml up -d --no-deps --force-recreate web
```

A plain `restart` does not reload changed Compose environment values. Preserve volumes, project name and auth secret. Container replacement must not reset installation state.

Do not expose the development Compose database publicly. Do not use `down --volumes` on a live installation.

## HTTPS reverse proxy

Public origins must match auth variables. Production owner cookies are secure, so use HTTPS. Configure the trusted edge to replace untrusted client-IP forwarding headers.

Example nginx configuration after obtaining a certificate for your domain and replacing these certificate paths:

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

The 280 MiB body allowance fits the default 256 MiB video, 10 MiB poster and overhead. Adjust when changing upload limits. With a trusted CDN upstream, configure nginx's real-IP trust for that provider. Preserve range responses and app cache headers.

Run `sudo nginx -t` before reloading. DNS, certificate issuance, firewall and provider-specific proxy caps remain operator responsibilities. References: [nginx body size](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size), [nginx request buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_request_buffering). This recipe has not been tested against your domain/certificate.

## Production without Docker

Provision PostgreSQL, Node 24, pnpm and FFmpeg. Use a dedicated service user and persistent writable media directory. Configure production HTTPS origins, a stable secret and the intended database URL.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

Run under a supervisor for permanent deployment. Ensure the service uses production mode, the correct working directory/environment and a PATH containing `ffprobe`. Put HTTPS in front as above.

Do not use development preflight as a production supervisor. Do not run `next dev` and a production build concurrently in the same checkout's `.next` directory.

## Optional Google sign-in

The application works without Google; password access remains available.

1. Create a Google OAuth **Web application** client and consent screen; add the owner as a test user if the Google project is in testing mode.
2. Register exactly `https://<yourdomain>/api/auth/callback/google`, replacing `<yourdomain>` with your real public domain or subdomain (including a Railway domain). The Account page shows the callback derived from `BETTER_AUTH_URL`; register that exact value. Development uses `http://localhost:3000/api/auth/callback/google`.
3. Set both Google environment variables, keep public/auth origins consistent, then restart/recreate web.
4. Sign in with the existing password and open `/admin/account`.
5. Choose **Link Google** and complete Google's flow. Linking/unlinking requires a session created within five minutes; sign out/in again if requested.

Google cannot register users. Matching email alone never grants access or automatically links an account. Only the explicitly linked Google subject may sign in. Explicit linking allows a different Google email, including for username-based owners. The password credential cannot be unlinked; Google unlinking refuses to leave the owner without password access.

Without credentials, account settings show configuration instructions and callback URL rather than a simulated activation. To change Google identity, unlink then link from a fresh session. Losing Google access does not require reopening setup.

Automated tests supply verified provider profiles to real Better Auth handlers/test databases. They test identity/linking restrictions, not Google's live network exchange/consent screen. Validate that round trip with your own client and callback domain.

## Migrations and updates

### Operators

Apply committed migrations, using the intended database:

```sh
pnpm db:migrate
```

SQL and metadata live in `drizzle/`. Development preflight and production Compose's migration service already invoke this command. Do not generate or reset schema for a normal installation/update.

### Developers changing tables

```sh
pnpm db:generate
```

Generate only after editing Drizzle table definitions. Review SQL and commit its matching metadata. Preserve migration history.

### Existing Docker installation

Back up database/media/config first, review changes, obtain the intended revision and retain `.env`, project name and volumes:

```sh
docker compose -f docker-compose.production.yml stop web
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml run --rm migrate
docker compose -f docker-compose.production.yml up -d web
docker compose -f docker-compose.production.yml logs --tail=100 web
```

Do not start new web after a failed migration. A rollback needs a compatible schema or matching backup. Never delete installation state to resolve an update. Avoid volume-pruning commands on a live server.

For direct Node, stop the supervisor, install from the lockfile, migrate, build, restart and smoke-test login/public posts/drafts/media.

## Backup and restore

### Retain a consistent set

Back up PostgreSQL **and** matching media, plus a restricted/encrypted copy of server configuration, stable auth secret and code revision. Retain multiple generations away from the app host and rehearse restoration.

Stop all application writers while taking a consistent database/media pair. Database references and media copied at unrelated times can mismatch.

### Docker with local media

Save outputs in a restricted directory with sufficient space:

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

Check each command succeeded; an empty/failed archive is not a backup. If a command fails, restart web when safe and correct it. The configuration copy contains secrets: restrict/encrypt before off-server transfer and never commit the backup directory.

For S3, use provider backups/versioning or copy all object keys while writers are stopped. SQL does not include bucket bytes. Keep backup media private.

### Restore drill in isolation

Use a **separate checkout and Compose project**, with code matching the backed-up revision. Put its archives in `backups/`. Use a new project name with empty database/uploads volumes. Do not reuse main installation volumes.

```sh
install -m 600 backups/environment.env .env
docker compose -p blogram-restore -f docker-compose.production.yml build
docker compose -p blogram-restore -f docker-compose.production.yml up -d --wait postgres
docker compose -p blogram-restore -f docker-compose.production.yml exec -T postgres pg_restore -U blogram -d blogram --no-owner --no-acl --exit-on-error < backups/blogram.dump
docker compose -p blogram-restore -f docker-compose.production.yml run --rm --no-deps --user root -T web sh -c 'mkdir -p /app/.data/uploads && tar -xzf - -C /app/.data/uploads && chown -R 1000:1000 /app/.data/uploads' < backups/uploads.tar.gz
docker compose -p blogram-restore -f docker-compose.production.yml run --rm --no-deps migrate
```

For S3, restore into an isolated private bucket and configure the restore checkout to use it instead of extracting local uploads. Do not test deletes/replacements against the production bucket.

Check restored state/data:

```sh
docker compose -p blogram-restore -f docker-compose.production.yml exec -T postgres psql -U blogram -d blogram -c 'SELECT status, completed_at FROM installation; SELECT count(*) AS posts FROM post; SELECT count(*) AS media FROM media;'
```

An isolated public smoke run can use a spare host port:

```sh
docker compose -p blogram-restore -f docker-compose.production.yml run --rm --no-deps -p 127.0.0.1:3100:3000 -e BETTER_AUTH_URL=http://localhost:3100 -e CORS_ORIGIN=http://localhost:3100 web
```

This checks public content locally. For full owner/OAuth verification use an isolated HTTPS test domain with matching origins/callback. Test images, seeking, counts, drafts and login. Stop the test container afterward; keep or intentionally discard only restore-project volumes.

These are supplied recovery procedures, not a claim that your backups have been restored successfully. Perform the drill before relying on a backup operationally.

## Owner access recovery

An administrator with server/database access can reset the existing owner's password without reopening setup:

```sh
node scripts/recover-owner.mjs
```

With Docker:

```sh
docker compose -f docker-compose.production.yml exec web node scripts/recover-owner.mjs
```

Use an interactive terminal. Prompts hide the database URL, new password and confirmation, then require typing `RESET`. Do not pass secrets in command arguments/history.

Inside Compose the URL shape is `postgresql://blogram:<POSTGRES_PASSWORD>@postgres:5432/blogram`; enter the actual password privately at the prompt. A host-run command needs a host-reachable URL; production PostgreSQL is not published by default.

Recovery requires a completed installation. It locks/updates or restores the credential with Better Auth hashing, revokes all owner sessions and preserves profile, posts, Google link and installation state. Normal passwords accept 1–128 characters. Back up before recovery. `SETUP_PASSWORD` is never involved.

If the identifier is forgotten, a trusted operator can inspect it without reading hashes:

```sh
docker compose -f docker-compose.production.yml exec -T postgres psql -U blogram -d blogram -c 'SELECT username, email FROM "user";'
```

Username-only accounts may have an internal `@owner.invalid` email; sign in with their username. Do not enable public signup or delete installation records to regain access.

## Troubleshooting

| Symptom                              | Check / action                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Setup not configured                 | Set `SETUP_PASSWORD` to at least 12 characters, restart/recreate web, reload `/admin`                                             |
| Wrong setup password                 | Use the installer password, not owner login; check copied spaces/quotes                                                           |
| Setup 429                            | Honor `Retry-After`; the guard uses a 15-minute per-client/global budget                                                          |
| Interrupted wizard                   | Unlock again; saved profile persists, unsaved credentials/files may need re-entry                                                 |
| Owner conflict during setup          | Inspect existing owner and installation state after backup; never erase accounts automatically                                    |
| Wizard closed after installation     | Expected: use `/sign-in` and normal owner credentials                                                                             |
| Production build rejects auth secret | Replace the development-only sample secret                                                                                        |
| Compose missing database password    | Set `POSTGRES_PASSWORD` before validation/startup                                                                                 |
| Database auth fails                  | Check URL, selected port, project/volume and original password; env changes do not change an initialized PostgreSQL role password |
| Site looks newly installed           | Confirm original database, project name and volumes before starting another setup                                                 |
| Upload 413                           | Check both app and proxy limits; video requests also contain a poster                                                             |
| Image 422                            | Check real JPEG/PNG/WebP bytes, decoded pixels and file size; renaming an extension is insufficient                               |
| Video unavailable                    | Ensure running service PATH contains `ffprobe`; Docker includes it                                                                |
| Accepted video will not play         | Check browser codecs and proxy range handling; test H.264 MP4                                                                     |
| Blank link preview                   | Targets may be blocked/private/slow/too large; enter metadata manually                                                            |
| S3 failures                          | Check API origin, bucket, region, addressing and object read/write/delete permissions                                             |
| Old bytes after storage outage       | Restore provider access and retry authenticated cleanup; queued keys remain in PostgreSQL                                         |
| Google button absent                 | Configure both OAuth variables and recreate web                                                                                   |
| Google callback fails                | Match exact callback/public origin, consent/test-user settings and HTTPS                                                          |
| Google linking asks to sign in again | A session younger than five minutes is required                                                                                   |
| Login fails behind proxy             | Check secure cookies, HTTPS, forwarded host/scheme and auth/trusted origins                                                       |
| `.env` change ineffective            | Restart direct Node; recreate Compose containers to load new environment                                                          |

Development logs are in the `pnpm dev` terminal. Production logs: `docker compose -f docker-compose.production.yml logs --tail=100 web migrate`. Share sanitized errors, not environment dumps, cookies, tokens, database URLs or full request bodies.

## Development and verification

```sh
pnpm typecheck
pnpm lint
pnpm test
node scripts/check.mjs
node scripts/check.mjs --full
```

The full check runs TypeScript, ESLint, all specs and a production build. Supply a production-valid unique auth secret for the build. CI generates an isolated ephemeral secret and explicitly installs FFmpeg; it does not need a real deployment secret.

Specs use migrated PGlite and temporary storage, separate from the running site's PostgreSQL/`.data`. Coverage includes setup locking/concurrency/privacy, owner protection, Google identity restrictions, file validation/ranges/draft visibility, publication/filtering, likes and cards. Bug repros remain colocated specs. Run a narrow file with `pnpm exec vitest run path/to/file.spec.ts`.

Tests do not prove real Google consent, provider-specific S3, DNS/TLS, every browser codec or your backup restore. Use the audit and an actual deployment smoke test to track those.

Read [AGENTS.md](AGENTS.md) and [conventions](docs/conventions/) before contributing. Do not weaken validation/tests to obtain a green check.

## Architecture

```text
src/app/                         Next pages and thin API routes
src/features/                    Public feed and owner feature UI
src/components/                  Shared application components
src/models/                      TypeBox schemas and derived types
src/design-system/tokens/        Theme/layout/motion tokens
src/design-system/ui/            shadcn/Radix-based primitives
src/i18n/                        English/Spanish messages and locale resolution
src/server/config/env.ts         Typed server configuration
src/server/modules/              Domain controllers/services/schemas
src/server/lib/storage/          Local/S3 driver abstraction
drizzle/                         SQL migrations and metadata
scripts/                         Checks, development preflight, owner recovery
```

Controllers handle transport; services own domain rules, protected transitions and Drizzle access. Shared schemas use `Models.X`. SQL holds references/configuration/counters; storage holds bytes. One error handler maps typed application errors without leaking internals.

## Limits and operational assumptions

- One owner; no public signup, comments, followers or messaging.
- Likes are anonymous browser votes, not unique people. Clearing storage, private browsing or a new device can vote again; no unlike.
- One image per photo; uploaded video requires a poster. No transcoding/adaptive streaming or editorial duration restriction.
- Saved optional cover/profile images can be replaced; a separate remove-saved-image control is not provided.
- Admin status filtering works in the query/API; a dedicated visible status-filter selector is not provided.
- Metadata is bounded text extraction; covers are uploaded separately. Third-party sites and YouTube may be unavailable.
- Storage outages can leave private unused bytes pending cleanup retry.
- Switching storage does not copy objects automatically.
- No public email-reset flow or outgoing email service is configured. Recovery requires server/database access.
- Native share and card download are supported; direct publishing into another app's stories/statuses is not.
- Large-scale streaming, horizontal deployment and public CDN media caching have not been validated. Preserve shared database/storage and privacy/cache rules if extending deployment.

## License

[MIT](LICENSE). Review dependency and external-media/provider terms for your deployment.
