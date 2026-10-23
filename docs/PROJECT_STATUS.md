# Project status and audit

Audit date: 23 October 2026. Starting revision: `f1c80ef` (`feat(media): add a reusable media input and redesign the post editor`). This report describes the working tree after the audit fixes; no release or external deployment is implied.

## Scope and current implementation

The application contains the six functional phases from the original brief:

| Phase | Implemented scope                                                                                          | Remaining external acceptance                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A     | PostgreSQL/Drizzle persistence, setup unlock/session/wizard, one owner, password auth, locked installation | Verify the chosen database, backups and production origin in the actual deployment |
| B     | Owner shell, profile/language edits, photo processing, drafts, preview/edit/publish/unpublish/delete       | Exercise storage permissions and deployment upload limits                          |
| C     | Public profile, chronological feed, URL filters, pagination, permanent pages and responsive layout         | Check the final owner's content on target devices                                  |
| D     | Uploaded video/poster, byte ranges, YouTube normalization, links/news, bounded metadata fetch              | Verify real S3/R2 and target browser codecs; no adaptive transcoding               |
| E     | Atomic anonymous likes, local browser markers, copy/native sharing, story and OG cards                     | Test native share on desired devices and external link-unfurl crawlers             |
| F     | Restricted Google linking, password retention, recovery, MIT license, Docker and operator documentation    | Real Google consent/callback, public HTTPS/DNS and an actual backup/restore drill  |

The wizard, profile media picker and post editor were already redesigned in the starting revision. Owner passwords accept 1–128 characters and password inputs support showing/hiding. The installer unlock password independently retains its 12-character minimum.

## Confirmed defects and fixes

Each application defect below has an executable regression test. Findings were reproduced against isolated PGlite databases or component tests, not by changing the owner's live content.

| Finding                 | Failure                                                                                                     | Fix                                                                                                                                                                 | Regression                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Setup profile privacy   | Anonymous `GET /api/setup` returned a saved profile while installation was still pending                    | Pending profile is returned only to a valid setup session                                                                                                           | `src/app/api/setup/setup-audit.route.spec.ts`                                                                                     |
| Setup completion race   | A profile write authorized before finalization could wait on its body, then overwrite the completed profile | Setup mutations and completion lock the installation row and write in one transaction; photo processing rechecks before committing and cleans rejected staged files | `src/app/api/setup/setup-audit.route.spec.ts`                                                                                     |
| Concurrent post edits   | An alt-text-only update could overwrite text saved concurrently                                             | Lock current records and update only provided fields; serialize type-specific merges                                                                                | `src/server/modules/posts/services/post-audit.service.spec.ts`                                                                    |
| Lost media cleanup      | Storage deletion errors were discarded after database references had been removed                           | Persist cleanup keys transactionally, retry bounded batches, retain failures and expose an owner-only retry endpoint                                                | `src/server/modules/media/services/media-cleanup.service.spec.ts`, `src/server/modules/posts/services/post-audit.service.spec.ts` |
| Incorrect media HEAD    | HEAD returned success for a storage object that GET could not find                                          | Verify object existence with a bounded read before returning metadata                                                                                               | `src/app/api/media/media-audit.route.spec.ts`                                                                                     |
| Stale link metadata     | Fetching a second URL kept the first URL's automatic title/description/source                               | Refresh untouched automatic fields and retain intentional manual edits, including cleared fields                                                                    | `src/features/posts/components/post-form.spec.tsx`                                                                                |
| Ineffective upload Undo | Successful replacement still displayed Undo after the previous server file was already replaced             | Adopt returned media immediately and clear the pending selection/blob after commit                                                                                  | `src/features/posts/components/post-form.spec.tsx`                                                                                |
| Stale like counter      | Newer server props did not update an already-mounted counter                                                | Track confirmed counts monotonically across responses and refreshed props                                                                                           | `src/features/feed/components/like-button.spec.tsx`                                                                               |

The CI configuration also lacked an explicit production-valid build secret and video tooling setup. It now generates an ephemeral build-only secret, installs FFmpeg and installs dependencies with the frozen lockfile. This does not configure a real deployment secret or claim that the remote GitHub job has run.

## Migration and deployment impact

`drizzle/0004_blushing_zemo.sql` adds `media_cleanup` and its retry index. It adds no owner or post changes and deletes no existing data. Apply committed migrations before running the new application version. The cleanup queue belongs in database backups.

Normal publication/deletion can complete while a failed storage delete remains queued. Later media operations retry up to 25 keys. An authenticated owner may invoke `POST /api/admin/media-cleanup`, which reports `{ deleted, pending }`. Pending bytes stay private when their public media reference has been removed. There is no external worker, timer or queue dependency.

The old local pending-installation test account was removed only after the owner explicitly authorized that action. Public profile and publication data were preserved. That was a local data repair, not an automatic application recovery policy.

## Verification record

Targeted fix suites passed for setup/privacy/concurrency, post/media transactions, cleanup retry/rollback, HEAD behavior, post forms, reusable media input and refreshed likes.

Final integration checks on the audited working tree:

- `node scripts/check.mjs`: PASS (TypeScript, ESLint and all tests).
- `docker build -t blogram:audit-verify .`: PASS, including the optimized Next.js production build and TypeScript validation.
- Offline runtime smoke: UID 1000, pnpm 10.34.7, FFprobe available, uploads directory writable and migration `0004` packaged.
- `pnpm db:migrate`: PASS against the local development database; the additive cleanup migration is applied.
- Live read-only HTTP smoke: public home 200, installation state `completed`, anonymous cleanup request 401. The development server remains available at `http://localhost:3000`.

Previously exercised in this work: production image build; non-root runtime; FFprobe and PostgreSQL dependencies; offline pnpm bootstrap; Compose configuration validation; mobile/desktop browser flows; production restart retaining profile/likes and keeping setup closed. These checks used disposable test data where mutations were needed.

Unverified with installation-specific credentials: Google network consent/callback, a real S3/R2 bucket, live HTTPS/reverse-proxy/DNS setup, external social crawlers and a full backup/restore drill. These checks do not include a live cloud deployment.

## Deliberate limitations and optional improvements

- Likes are browser-local anonymous votes, not unique-person votes; no unlike action.
- One media item per photo/video post; video requires a separate poster. No transcoding, adaptive bitrate streaming or automatic poster extraction.
- Automatic metadata is limited to text fields; cover images are uploaded manually.
- Saved optional covers/profile photos support replacement but not a dedicated remove action.
- Admin status filtering is supported by query/API without a visible selector.
- No outgoing-email password reset is configured; server/database recovery is provided.
- Switching storage providers requires copying existing object keys; no automatic media migration tool.
- Storage cleanup is eventually retried; database/object storage do not share a distributed transaction.
- Public signup, multiple owners, comments, followers, messaging and recommendation/AI features remain intentionally out of scope.

## Operator handoff

The [README](../README.md) contains local setup, every environment variable, Docker/direct Node deployment, nginx configuration, Google setup, migration/update commands, matched database/media backups, isolated restoration, owner recovery and troubleshooting. Do not reset persistent data to resolve an ordinary update or sign-in problem.

The publication handoff adds a repository link in both footer languages and `railway.json` for Docker builds, pre-deploy migrations and health checks. The README includes Railway with private R2 storage and distinguishes new deployments from migration of existing local content. The public source location is [tiago-o-pinheiro/blogram](https://github.com/tiago-o-pinheiro/blogram). Real Railway/R2 credentials have not been provisioned by this change.
