# Website static asset delivery

## Problem

The public website at `abyrd.me` returns its generated CSS files as the HTML
404 page. The browser therefore renders the page without its stylesheet.

The regression came from commit `3dea8bd` (`Add software resume and harden
production site`), which replaced the prior wildcard route with a `fetch`
fallback that always returns the 404 page. Compiled HTML imports emit CSS,
JavaScript, fonts, and image files alongside the server bundle. Those emitted
files must remain reachable before the fallback responds with a 404.

## Decision

Keep the existing Bun/Railway website service and preserve a real custom 404.
Add a production-only static-asset fallback that reads only safe, generated
asset paths from the `dist` directory. It will reject path traversal and paths
outside a small allowlist of public asset extensions.

Known application routes continue to be handled by Bun's route table. For an
otherwise unmatched request, the fallback will:

1. Serve a matching emitted asset with its normal content type.
2. Otherwise return the existing 404 page with HTTP status 404.

## Verification

Add a regression test that starts the production build, requests the homepage,
extracts its stylesheet URL, and asserts that request returns `200` with a CSS
content type. The deployment check repeats the same assertions against
`https://abyrd.me` after the website service is deployed.
