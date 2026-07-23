# Searchable System-Design Catalog Design

## Goal

Expand the private flashcard app into a catalog that Andrew can search when he
needs to learn or refresh a system-design idea. Keep the algorithm decks in the
same place.

## User experience

The study page will have one search box. It will search system terms,
architecture patterns, and algorithm titles. Filters will let the user narrow
results to all content, system concepts, architecture patterns, or algorithms.

Search results will open the matching card or algorithm deck. The app will keep
the existing flashcard controls: turn a system card, choose an item, and move
through algorithm cards.

## Content

The larger catalog will organize original, short cards into system concepts and
architecture patterns. A pattern card will state what the pattern is, the
problem it solves, when to use it, its main cost, and an example.

The first architecture-pattern group will include client-server, layered,
microservices, event-driven, queue-based, API gateway, CQRS, event sourcing,
pipeline, sidecar, serverless, and peer-to-peer systems.

The System Design Primer will guide the catalog's broad topic map. The app will
link to it for further reading but will not copy its text.

## Architecture

`src/server/flashcards.ts` will add a category to system cards and a separate
architecture-pattern collection. The authenticated server function will still
return one deck object.

The `/quiz` route will derive search results in the browser from that object.
It will keep only the search text, selected filter, and selected card in React
state. Search will not need a new server endpoint.

## Error handling and tests

The existing load error remains. Content tests will check the architecture
pattern count, required pattern fields, and the searchable category data.

`bun run check` will run tests, formatting, types, and production builds. A
browser smoke test will cover search, opening a pattern, and opening an
algorithm result.
