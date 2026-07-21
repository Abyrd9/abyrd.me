# abyrd.me

The source for [abyrd.me](https://abyrd.me) and its private companion app. It is a Bun workspace with two independently deployable packages.

| Package | Purpose | Local command |
| --- | --- | --- |
| `@abyrd/website` | Public personal site | `bun run dev` |
| `@abyrd/app` | Private personal tools | `bun run dev:app` |

## Commands

Install dependencies:

```bash
bun install
```

Start the public site:

```bash
bun run dev
```

Start the private app:

```bash
bun run dev:app
```

Start both through Harbor:

```bash
harbor launch --headless --name=abyrd
```

Build and start the public site locally:

```bash
bun run build
bun --filter @abyrd/website start
```

Run all tests and checks:

```bash
bun run check
```

## Private app credentials

The app is closed to everyone except the configured operator. Add these variables to the Railway app service (never commit their values):

```text
APP_USERNAME
APP_PASSWORD
APP_SESSION_SECRET
```

`APP_SESSION_SECRET` must be a random, high-entropy value. It signs the 14-day session cookie; rotating it signs out every existing browser session. Copy [`packages/app/.env.example`](packages/app/.env.example) for local development.

The current public website service continues to use [`railway.toml`](railway.toml). Configure the new Railway service with [`railway.app.toml`](railway.app.toml), then add its Railway-provided CNAME and TXT records to Cloudflare for `app.abyrd.me`.
