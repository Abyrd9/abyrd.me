# Use Bun's official image
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build the production bundle
FROM base AS build
COPY --from=install /temp/prod/node_modules node_modules
COPY src ./src
COPY package.json ./
COPY bunfig.toml ./
COPY tsconfig.json ./
RUN bun run build

# Run the built bundle
FROM base AS release
COPY --from=build /app/dist ./dist
COPY package.json ./

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port (Railway will set PORT env variable)
EXPOSE 8080

CMD ["bun", "run", "start"]
