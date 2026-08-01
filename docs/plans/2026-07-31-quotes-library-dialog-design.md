# Quotes library: browse first

The Quotes page should lead with the saved library instead of a large form.

## Decided

- Show the saved quotes and a search field on `/quotes`.
- Put an **Add quote** button beside the search controls.
- Open one modal dialog for both adding and editing.
- Prefill that dialog when the user chooses **Edit**.
- Keep permanent delete and its inline confirmation unchanged.
- Keep the existing database table and server functions unchanged.

## Structure

`packages/app/src/routes/_authenticated.quotes.tsx` owns this UI change. It
already owns the list, TanStack Form state, and the quote server functions, so
there is no need for a new shared module.

The list filters in the browser across quote text, attribution, source URL, and
source note. Saving closes the dialog and updates the existing list state.

## Checks

- Search matches every saved-text field and shows an empty result message.
- Add opens an empty dialog; Edit opens a filled dialog.
- Save, validation, and delete continue to use the existing server functions.
- Run the quote test, TypeScript check, and production build.
