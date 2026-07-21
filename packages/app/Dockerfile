FROM oven/bun:1.3.14

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/app/package.json packages/app/package.json
COPY packages/website/package.json packages/website/package.json
RUN bun install --frozen-lockfile

COPY packages/app packages/app
WORKDIR /app/packages/app
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["bun", ".output/server/index.mjs"]
