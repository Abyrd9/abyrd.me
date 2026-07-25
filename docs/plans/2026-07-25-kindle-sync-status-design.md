# Kindle Sync Status and Re-sync Design

## Goal

Make Kindle sync understandable and recoverable. The app must show whether the
extension is installed, connected, syncing, finished, blocked by Amazon sign-in,
or needs to reconnect. A manual re-sync must take one click.

## Source of truth

The extension stores its configuration and latest sync state in Chrome local
storage. The app page reads that state through the existing content-script
bridge. The server remains the source of truth for completed imports and Kindle
data; it does not need Amazon credentials or a separate connection table.

## Statuses

- `not-connected`: extension is present but has no app URL or sync token.
- `ready`: extension is connected and ready to sync.
- `syncing`: Kindle Notebook is open and the extension is reading highlights.
- `complete`: the import succeeded, with imported book and annotation counts.
- `needs-amazon-sign-in`: Kindle Notebook redirected to Amazon sign-in.
- `needs-reconnect`: the app rejected the stored sync token.
- `failed`: another recoverable error occurred.

## Flow

1. The setup page renders its normal token-bearing button.
2. The content script waits for that button without mutating the page while it
   waits. This avoids the existing MutationObserver feedback loop.
3. Once the button exists, the content script asks the service worker for its
   stored status and updates the setup UI. Connecting stores the app origin and
   token, then starts a sync.
4. The Kindle library exposes a `Sync now` button. The bridge forwards that
   click to the service worker, which starts or reuses a Notebook sync.
5. The worker persists each status update and broadcasts it to every open app
   page. The bridge updates the displayed status and refreshes the library after
   a successful import.
6. A Kindle sign-in redirect produces a specific recovery message. After the
   user signs in in the opened tab, the same sync resumes automatically. An
   import authorization failure produces a reconnect message and setup link.

## Error handling

- Do not silently ignore notebook or import errors.
- Never expose the sync token in page text, logs, or extension status.
- Keep a stale Notebook tab from blocking a manual re-sync forever.
- Preserve daily scheduling after successful setup.

## Verification

- Unit-test extension status transitions where practical.
- Load the unpacked extension in a clean Chrome profile.
- Verify setup changes from detected to connected, then from syncing to an
  Amazon sign-in recovery state in a profile without an Amazon session.
- Run app tests, lint, typecheck, build, extension archive validation, then
  deploy and check Railway health.
