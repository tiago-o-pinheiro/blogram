# Learnings

- [gates] Deleting app routes leaves stale `.next/**/types/validator.ts` entries that fail typecheck; clear `.next` after route removals (20261023-1237-phase-a-of-the-blogram)
- [planning] Every coder group must leave check.mjs green: put each deletion or breaking config change in the same task as the specs and imports it breaks (20261023-1237-phase-a-of-the-blogram)
- [security] Throttles must count the attempt atomically before comparing the secret, and an already-locked client must not consume the global bucket (20261023-1237-phase-a-of-the-blogram)
- [qa] jsdom specs cannot see layout; take browser screenshots of UI runs before qa and pass what they show in the qa NOTE (20261023-1958-create-one-reusable-media-input)
- [ui] When replacing saved media, keep the local preview until the refreshed entity's media id changes; clearing it right after upload flashes the deleted file (20261023-1958-create-one-reusable-media-input)
- [ui] A drop zone must handle drag events at its field root, or a near-miss drop makes the browser open the file and lose the unsaved form (20261023-1958-create-one-reusable-media-input)
