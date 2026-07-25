# App SQLite foundation design

## Goal

Give the private app a durable, typed SQLite foundation for future personal tools without inventing a data model before one is needed.

## Storage and deployment

- Use a single SQLite file backed by a Railway volume attached to the existing `app` service.
- Set `APP_DATABASE_PATH=/data/app.sqlite` in Railway and mount the volume at `/data`.
- Use `./data/app.sqlite` for local development.
- Keep the service at one replica. Railway volumes are single-service storage and do not support replicas.

## Database module

- Add `drizzle-orm` and `drizzle-kit` to `packages/app`.
- Use Drizzle's `bun-sqlite` adapter and Bun's built-in `bun:sqlite` driver.
- Add `src/server/database/` for:
  - typed database configuration;
  - the empty Drizzle schema entry point;
  - a single SQLite client constructor;
  - the Effect database service and live layer;
  - migration execution.
- Keep SQL schema files in `packages/app/drizzle/` once the first model is added. An intentionally empty schema has no SQL migration to generate.

## Runtime behavior

- Read `APP_DATABASE_PATH` through Effect configuration.
- Refuse to use the local default when running in Railway without an explicit database path.
- Open one connection, enable foreign-key enforcement and WAL journaling, then apply committed migrations before exposing the client.
- Model initialization or migration failure as a typed database-startup error. Route handlers provide the live layer at the server boundary; future repositories depend on the service rather than opening SQLite directly.

## Tooling and verification

- Add Bun scripts for generating, checking, and applying Drizzle migrations.
- Test configuration and database initialization against temporary SQLite files; verify migration execution when migration files exist.
- Run formatting, focused tests, TypeScript checks, and production build.
- Create the Railway volume only after code and local checks pass, then set the production database path and verify the app health endpoint after deployment.
