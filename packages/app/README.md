# @abyrd/app

The private side of abyrd.me, built with TanStack Start, TanStack Form, Base UI, and Effect v3.

## Run

From the repository root:

```bash
bun run dev:app
```

The local app listens on `http://localhost:3001`.

## Credentials

Set these locally or in Railway before opening a protected route:

```text
APP_USERNAME
APP_PASSWORD
APP_SESSION_SECRET
```

The app has no account creation. A successful sign-in creates a signed, `HttpOnly` session cookie valid for 14 days.

## Database

The app uses Drizzle with Bun's built-in SQLite driver. It opens one connection when the production server starts, enables WAL mode, foreign keys, and a busy timeout, then applies committed migrations before serving requests.

Set `APP_DATABASE_PATH` explicitly in Railway:

```text
APP_DATABASE_PATH=/data/app.sqlite
```

For local work, the default is `./data/app.sqlite`. The local data directory is ignored by Git.

```bash
bun --cwd packages/app run db:generate
bun --cwd packages/app run db:check
bun --cwd packages/app run db:migrate
```

Define tables in `src/server/database/schema.ts`. Feature code should use a repository module that depends on the `AppDatabase` Effect service; it must not open its own SQLite connection.

## Checks

```bash
bun --filter @abyrd/app check
```

## Deployment

Railway builds this package from the workspace root with `packages/app/Dockerfile`. Its service configuration lives in [`railway.app.toml`](../../railway.app.toml).
