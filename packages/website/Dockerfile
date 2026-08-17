# Build the website with the root workspace available.
FROM oven/bun:1.3.14 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/app/package.json packages/app/package.json
COPY packages/kindle-extension/package.json packages/kindle-extension/package.json
COPY packages/website/package.json packages/website/package.json
RUN bun install --frozen-lockfile

COPY packages/website packages/website
WORKDIR /app/packages/website
RUN bun run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "run", "start"]
