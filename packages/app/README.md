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

## Kindle MCP for Codex

The `/api/mcp` endpoint stays disabled unless `APP_MCP_TOKEN` is set to a separate secret of at least 32 characters. For local development only, a loopback request can instead use the token in macOS Keychain under service `me.abyrd.kindle-mcp.local` and account `token`. Railway and production never use this fallback. Generate a random token with at least 32 bytes of entropy; do not reuse the app password or Kindle sync secret. Store it outside Git and logs. Anyone with the token can read the Kindle and quote libraries and edit personal notes, chapters, assignments, and archive state. Rotate the token if it is exposed. Kindle-imported text cannot be edited through these tools.

For the local Keychain setup, the checked-in `scripts/kindle-mcp-local-auth.ts` reads the token and supplies its authorization header. Codex can run that script through `http_headers_helper`; it does not need the token in its configuration. Alternatively, set the token in the app's environment and in the Codex process environment, then configure the connection without putting the token itself in the config:

```toml
[mcp_servers.kindle]
url = "http://localhost:3001/api/mcp"
bearer_token_env_var = "APP_MCP_TOKEN"
default_tools_approval_mode = "writes"
```

For a remote app, use its HTTPS URL. Codex must actually inherit the token in its own process environment; a shell variable alone may not reach the desktop app. A new Codex session may be needed after configuring the connection. This bearer-token setup is for Codex, not ChatGPT's OAuth-based custom MCP connection.

## Database

The app uses Drizzle with Bun's built-in SQLite driver. It opens one connection when the production server starts, enables WAL mode, foreign keys, and a busy timeout, then applies committed migrations before serving requests.

Set `APP_DATABASE_PATH` explicitly in Railway:

```text
APP_DATABASE_PATH=/data/app.sqlite
```

For local work, the default is `./data/app.sqlite`. The local data directory is ignored by Git.

Run `bun run db:studio` from `packages/app` to browse the local database at https://local.drizzle.studio. Harbor also starts Studio as the `studio` service. Studio can edit the database it opens.

To save a separate snapshot of the production database, sign in to the Railway CLI and run `bun run db:pull-production` from `packages/app`. Each run creates a timestamped SQLite file in the Git-ignored `data` directory; it does not replace the local app database. To browse a snapshot, stop the running Studio service and start it with `APP_DATABASE_PATH=./data/<snapshot-file>.sqlite bun run db:studio`.

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
