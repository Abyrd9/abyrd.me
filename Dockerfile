# Use Bun's official image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy application code
FROM base AS release

# Copy node_modules from install stage
COPY --from=install /temp/prod/node_modules node_modules

# Copy all application source files
COPY src ./src
COPY package.json ./
COPY bunfig.toml ./
COPY tsconfig.json ./ 

# Set environment to production
ENV NODE_ENV=production

# Expose the port (Railway will set PORT env variable)
EXPOSE 8080

# Run the application
CMD ["bun", "run", "start"]

