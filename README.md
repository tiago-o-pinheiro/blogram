# Blogram

## Setup

```sh
pnpm install
pnpm dev
```

Node 24 (`.nvmrc`). Copy the `.env.example` of each deployable to `.env` when it has one.

## Commands

- `pnpm dev`
- `pnpm check`
- `pnpm test`
- `pnpm lint`
- `pnpm build`

## Structure

| Layer  | Path                     |
| ------ | ------------------------ |
| web    | .                        |
| api    | .                        |
| models | src/models               |
| tokens | src/design-system/tokens |
| ui     | src/design-system/ui     |
| i18n   | src/i18n                 |
| config | config                   |

Conventions: see `CLAUDE.md` and `docs/conventions/`.
