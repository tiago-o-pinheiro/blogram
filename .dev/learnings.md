# Learnings

- [gates] Deleting app routes leaves stale `.next/**/types/validator.ts` entries that fail typecheck; clear `.next` after route removals (20261023-1237-phase-a-of-the-blogram)
- [planning] Every coder group must leave check.mjs green: put each deletion or breaking config change in the same task as the specs and imports it breaks (20261023-1237-phase-a-of-the-blogram)
- [security] Throttles must count the attempt atomically before comparing the secret, and an already-locked client must not consume the global bucket (20261023-1237-phase-a-of-the-blogram)
