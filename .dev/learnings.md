# Learnings

- [gates] Deleting app routes leaves stale `.next/**/types/validator.ts` entries that fail typecheck; clear `.next` after route removals (20261023-1237-phase-a-of-the-blogram)
- [planning] Every coder group must leave check.mjs green: put each deletion or breaking config change in the same task as the specs and imports it breaks (20261023-1237-phase-a-of-the-blogram)
- [security] Throttles must count the attempt atomically before comparing the secret, and an already-locked client must not consume the global bucket (20261023-1237-phase-a-of-the-blogram)
- [qa] jsdom specs cannot see layout; take browser screenshots of UI runs before qa and pass what they show in the qa NOTE (20261023-1958-create-one-reusable-media-input)
- [ui] When replacing saved media, keep the local preview until the refreshed entity's media id changes; clearing it right after upload flashes the deleted file (20261023-1958-create-one-reusable-media-input)
- [ui] A drop zone must handle drag events at its field root, or a near-miss drop makes the browser open the file and lose the unsaved form (20261023-1958-create-one-reusable-media-input)
- [gates] A local `next build` fails when `.env` holds the dev-only BETTER_AUTH_SECRET (production guard); export a unique secret for the build gate, as CI does (20261025-1128-1-improve-the-readme-add)
- [planning] When one task sources content from a file another task rewrites (old README → new docs), give both to one coder in order, never parallel coders (20261025-1128-1-improve-the-readme-add)
- [ci] Publish images from a job that `needs` the check job in the same workflow, not a separate push-triggered workflow, so a failing build never ships as latest (20261025-1128-1-improve-the-readme-add)
- [i18n] The translator only interpolates `{{name}}`; write placeholders with double braces in plan contracts, or parallel UI coders each patch the shared JSON (20261025-1314-research-similar-open-source-photo)
- [dev] `pnpm dev` does not derive the Compose port from DATABASE_URL; a non-5432 DATABASE_URL needs a matching DB_PORT in .env or db:up binds 5432 (20261025-1314-research-similar-open-source-photo)
- [validation] Validate untrusted metadata such as EXIF per field, never as one object, so a single out-of-range value does not drop the rest (20261025-1314-research-similar-open-source-photo)
