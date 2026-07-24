# Responsive theme design

## Goal

Make the private app comfortable to use on a phone and provide a deliberate light or dark appearance.

## Theme behavior

- Resolve the first-visit theme from the device preference.
- Provide a light/dark toggle in the authenticated header.
- Save an explicit choice in browser storage and use it on later visits.
- Apply the selected theme at the document root so the sign-in screen, authenticated layout, controls, and cards share the same palette.

## Responsive behavior

- Keep the desktop layout unchanged where room permits.
- Compact the header on small screens without allowing horizontal overflow.
- Stack study controls, search filters, card detail sections, and navigation controls into a single readable column.
- Keep form fields and buttons at touch-friendly sizes and use the available screen width.

## Components and data flow

- A small client-side theme module owns reading, setting, and persisting the selected theme.
- The authenticated layout renders the toggle and supplies the app frame.
- Shared primitives and route-specific components receive dark-mode utility styles.
- No server-side state or authentication behavior changes.

## Failure handling and verification

- If browser storage is unavailable, retain the device preference without failing the page.
- Verify both themes, a narrow mobile viewport, and persisted toggle selection.
- Run formatting, tests, type checks, and production builds.
