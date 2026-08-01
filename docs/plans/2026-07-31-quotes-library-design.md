# Quotes library design

Add a private Quotes section to the app.

## Scope

- Add a `Quotes` link to the authenticated navigation and a `/quotes` page.
- Let Andrew create, edit, and permanently delete quotes.
- Quote text is required. Attribution, source URL, and source note are optional.
- Confirm a delete before removing a quote.

## Data

The `quotes` SQLite table has a numeric primary key, quote text, optional attribution, optional URL, optional source note, `created_at`, and `updated_at`.

The existing code-first Drizzle workflow remains unchanged: define the table in the schema, generate committed SQL, and let the server apply migrations on startup.

## Boundaries

- `src/server/quotes.ts` owns database reads and mutations.
- `src/server/quotes-functions.ts` owns authenticated, Zod-validated server functions.
- `_authenticated.quotes.tsx` owns the form state and list UI.

No tagging, search, archiving, or trash/recovery area is part of this first pass.

## Checks

- Test quote creation, editing, permanent deletion, and newest-first order through the Quotes domain module.
- Generate and inspect the SQL migration, then run Drizzle's migration check.
- Run app tests, lint, typecheck, and production build.
