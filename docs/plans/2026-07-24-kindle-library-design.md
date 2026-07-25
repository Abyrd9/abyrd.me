# Kindle Library Design

## Goal

Bring the Kindle Sync product into the private `app.abyrd.me` application. Keep its browser extension as a workspace package, but do not run a separate Kindle service or database.

## Boundaries

- `packages/app` owns every web route, server function, database table, migration, repository, and Railway configuration.
- `packages/kindle-extension` owns only the Chrome extension source and archive script.
- The extension sends validated Kindle data to `app.abyrd.me`; it has no database or deployment of its own.
- The existing `Abyrd9/kindle-sync` repository remains unchanged.

## Data model

### `kindle_books`

- `asin`: Kindle's stable book identifier and primary key.
- `title`, `author`, `lastAnnotatedAt`, and `lastSyncedAt`.

### `kindle_annotations`

- Local numeric primary key.
- `bookAsin`, foreign key to `kindle_books`.
- `sourceKey`, a unique deterministic fingerprint of the Kindle annotation.
- Kindle data: position, highlight, note, location, page, and Kindle-added date.
- `firstSeenAt` and `lastSeenAt` for import history.
- `archivedAt`, nullable. `NULL` means visible in normal lists and search; a timestamp means hidden and recoverable.

### `kindle_sync_runs`

- Start and finish timestamps, status, imported book and annotation counts, and a short error message.

## Import rules

1. Validate the extension payload and reject malformed or oversized requests.
2. Upsert books by ASIN.
3. Upsert annotations by `sourceKey`.
4. Update fields supplied by Kindle and `lastSeenAt`; never overwrite `archivedAt`.
5. Do not delete local annotations that are absent from a sync. Kindle's scraper can return a partial result, and local archive decisions must survive later imports.
6. Record every import attempt in `kindle_sync_runs`.

## Security and sync flow

- `/kindle` and every Kindle action stay inside the existing authenticated app layout.
- `/kindle/setup` packages and explains the extension installation.
- The setup page gives the extension the approved app origin and a dedicated bearer token derived from a redacted `APP_KINDLE_SYNC_SECRET` value.
- The extension stores its configuration in Chrome extension storage, reads Kindle Notebook using the user's existing Amazon session, and posts its payload to a server-only import endpoint.
- The endpoint uses a timing-safe token comparison and does not receive Amazon credentials or cookies.
- Production extension permissions allow `https://app.abyrd.me/*`; the development extension also allows the Tailscale preview origin.

## App experience

- `/kindle` is the library home: recent sync status, books, and visible annotations.
- Search and normal lists exclude archived annotations by default.
- A per-annotation action archives or restores an annotation.
- `/kindle/archived` shows archived annotations so they can be restored.
- Copy follows the app's existing clear, direct writing style.

## Verification

- Unit-test payload parsing, stable-key generation, archive-preserving upserts, and archive/restore queries.
- Test the authenticated server actions and token-protected import endpoint.
- Build the extension archive and inspect its manifest permissions.
- Run app linting, tests, typechecking, Drizzle migration checks, and production build.
