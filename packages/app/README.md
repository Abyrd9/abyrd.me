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

The app has no account creation or database. A successful sign-in creates a signed, `HttpOnly` session cookie valid for 14 days.

## Checks

```bash
bun --filter @abyrd/app check
```

## Deployment

Railway builds this package from the workspace root with `packages/app/Dockerfile`. Its service configuration lives in [`railway.app.toml`](../../railway.app.toml).
