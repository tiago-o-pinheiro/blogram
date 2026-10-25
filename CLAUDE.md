# Blogram

## Stack

- Layout: single
- Package manager: pnpm
- Frontend: next
- Backend: next
- Validation: typebox
- UI: shadcn
- State: context
- ORM: drizzle
- Auth: better-auth

## Where things go

| Layer  | Path                     |
| ------ | ------------------------ |
| web    | .                        |
| api    | .                        |
| models | src/models               |
| tokens | src/design-system/tokens |
| ui     | src/design-system/ui     |
| i18n   | src/i18n                 |
| config | config                   |

Backend modules live at `modules/<domain>/{routers,controllers,services,schemas}/<domain>.<layer>.ts`.
Shared schemas live in the models layer and are imported as `Models.X`.

## Commands

- `pnpm dev`
- `pnpm check`
- `pnpm test`
- `pnpm lint`
- `pnpm build`

Run `pnpm check` (and `pnpm build` for the full gate) before reporting done.

## Conventions

- docs/conventions/typescript.md
- docs/conventions/testing.md
- docs/conventions/git.md
- docs/conventions/hooks.md
- docs/conventions/react.md
- docs/conventions/design-system.md
- docs/conventions/backend.md
- docs/conventions/validation.md

These files override any default. Read the relevant ones before writing code.

## Critical rules

1. Hooks return at most 4 values and are never wrappers over other hooks; call hooks directly where the values are used.
2. Layers only: router, controller, service, ORM. Controllers never touch the ORM.
3. Throw typed errors (`GlobalError` subclasses). One error handler builds the response.
4. Tokens only: no hex, no px, no arbitrary Tailwind values.
5. Specs sit next to the source and read `it('Given X, should Y')`.
6. No `as` casts (except `as const`), no `any`, no `!`, no enums, no comments, arrow functions only.
7. Env is read in one typed module; never `process.env` elsewhere.
8. Before done: `pnpm check` must pass.
9. Everything moves. Every component animates its entrance and transitions its state changes with the motion tokens (`animate-*`, `transition`, `press`, `stagger`). Selected options slide with `SlidingPill`, dialogs and sheets animate in and out, swapped content is keyed so its entrance replays. Reduced motion keeps fades and drops movement through tokens; never switch animation off globally. See the Motion section of docs/conventions/design-system.md.

## Pipeline

`/dev:feature <request> [--tier S|M|L]` plans, implements, tests and reviews a feature. Run state is in `.dev/runs/` (ignored); durable lessons go to `.dev/learnings.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
