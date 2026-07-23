# Study Flashcards Design

## Goal

Replace the interview rehearsal page with a private flashcard app. It will help
Andrew learn common system-design terms and review clear algorithm solutions in
TypeScript and Go.

## User experience

The authenticated `/quiz` page will have two sections:

- System design terms: a card shows a term. Turning it over shows a plain
  definition, why it matters, and a short example.
- Algorithms: a user chooses a problem, then turns through cards for the
  pattern, steps, TypeScript solution, Go solution, time and memory cost, and
  a common mistake.

The page will let a user move forward and backward or choose another item at
any time. It will not require a schedule, timer, answer form, score, or quiz.

## Content

The first system-design deck will include common interview terms such as cache,
load balancer, queue, idempotency, rate limiter, sharding, replication,
partition, consistency, and backpressure.

The first algorithm deck will reuse the ten existing coding problems. Each
solution will use the same clear structure and give working TypeScript and Go
code. The code will favor direct, idiomatic solutions over clever shortcuts.

## Architecture

`src/server/flashcards.ts` will hold declarative deck content. Its public data
will contain only the cards that the page needs. An authenticated TanStack Start
server function will load both decks with `Cache-Control: no-store`.

`src/routes/_authenticated.quiz.tsx` will load the deck data and manage only
the selected section, item, and card position. Small presentational components
will render a flashcard and its navigation.

The old interview rehearsal route data, answer form, and server functions will
be removed because the new page replaces that experience.

## Error handling and tests

The page will show a short retry message if it cannot load a deck. Content tests
will check the number of terms and algorithms, each algorithm's TypeScript and
Go cards, and the absence of the old rehearsal API.

`bun run check` will run tests, formatting, types, and production builds. A
browser smoke test will confirm the two decks load behind authentication.
