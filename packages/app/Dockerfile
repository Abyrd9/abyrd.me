FROM oven/bun:1.4.0

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/app/package.json packages/app/package.json
COPY packages/kindle-extension/package.json packages/kindle-extension/package.json
COPY packages/website/package.json packages/website/package.json
RUN bun install --frozen-lockfile

COPY packages/app packages/app
WORKDIR /app/packages/app
RUN bun run build
RUN bun prune --production

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["bun", ".output/server/index.mjs"]
