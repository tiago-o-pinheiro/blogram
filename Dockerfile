FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN BETTER_AUTH_SECRET="$(node --input-type=module -e 'import { randomBytes } from "node:crypto"; process.stdout.write(randomBytes(32).toString("hex"))')" pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install --yes --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/* && corepack enable
COPY --from=build --chown=node:node /app ./
COPY --from=build --chown=node:node /root/.cache/node/corepack /opt/corepack
RUN mkdir -p /app/.data/uploads && chown -R node:node /app/.data
ENV NODE_ENV=production
ENV COREPACK_HOME=/opt/corepack
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
