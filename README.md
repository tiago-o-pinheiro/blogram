<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/blogram-logo-dark.svg">
    <img src="docs/assets/blogram-logo-light.svg" alt="Blogram" width="320">
  </picture>
</p>

<p align="center">
  A personal multimedia journal you host on your own server and domain.<br>
  One owner publishes; everyone else can read, filter, like and share without an account.
</p>

<p align="center">
  <a href="https://github.com/tiago-o-pinheiro/blogram/actions/workflows/ci.yml"><img src="https://github.com/tiago-o-pinheiro/blogram/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>

## Features

- Photos, uploaded videos, YouTube, links and news in one feed
- Drafts, preview and publish, with an optional place on every post
- Public feed with type filters, permanent post pages and anonymous likes
- Story cards and Open Graph images for sharing
- Local or S3-compatible storage (Cloudflare R2, MinIO, AWS)
- Optional Google sign-in linked to the single owner
- English and Spanish interface
- Built with Next.js, PostgreSQL, Drizzle, Better Auth and TypeBox

## Quick start

1. Install Node 24, run `corepack enable`, and have Docker and FFmpeg available.
2. Clone the repository and install dependencies:
   ```sh
   git clone https://github.com/tiago-o-pinheiro/blogram.git && cd blogram && pnpm install
   ```
3. Create your environment file, then set `BETTER_AUTH_SECRET` (`openssl rand -hex 32`) and `SETUP_PASSWORD` (`openssl rand -hex 24`) in `.env`:
   ```sh
   cp .env.example .env
   ```
4. Start the database, apply migrations and run the app:
   ```sh
   pnpm dev
   ```
5. Open [localhost:3000/admin](http://localhost:3000/admin), enter your `SETUP_PASSWORD` and finish the wizard.

## Deploy

- **Railway and Cloudflare R2:** Railway runs the app and PostgreSQL, a private R2 bucket stores media. See [Railway and Cloudflare R2](docs/self-hosting.md#railway-and-cloudflare-r2).
- **Docker Compose:** one server with PostgreSQL, migrations and the published image from GHCR. See [Docker Compose](docs/self-hosting.md#docker-compose).
- **Node without Docker:** run `pnpm start` under your own supervisor. See [Node without Docker](docs/self-hosting.md#node-without-docker).

Every setting is listed in [Configuration](docs/self-hosting.md#configuration). Put the site behind [HTTPS](docs/self-hosting.md#https-with-nginx).

## Using Blogram

Write a draft, preview it, then publish. Posts can be photos, videos, YouTube, links or news, each with an optional place. See [Using Blogram](docs/using-blogram.md) for the [owner pages](docs/using-blogram.md#owner-pages), [post types](docs/using-blogram.md#post-types) and [limits](docs/using-blogram.md#limits).

## Updating and backups

- [Updating](docs/self-hosting.md#updating)
- [Backup and restore](docs/self-hosting.md#backup-and-restore)
- [Recover owner access](docs/self-hosting.md#recover-owner-access)
- [Troubleshooting](docs/self-hosting.md#troubleshooting)

## Contributing

1. Run `pnpm check` (typecheck, lint, tests) and `pnpm build` before opening a pull request.
2. Write specs for new behavior, next to the source.
3. Use Conventional Commit titles, such as `fix(feed): keep filters on page change`.
4. Read the rules in [`docs/conventions/`](docs/conventions/) first.
5. If your clone still has the old git hooks, run `git config --unset core.hooksPath` once.

## License

[MIT](LICENSE)
