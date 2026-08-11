# Study pages on small screens

The Study page should be comfortable at 320px wide without removing any of its
training material.

## Decided

- Keep the same term, architecture, and algorithm lesson flows.
- Treat 320px as the smallest supported width.
- Stack controls and lesson rows when their desktop layout would squeeze text.
- Keep horizontal scrolling inside code and visual cards only. The document
  itself must not scroll sideways.
- Make the seven algorithm steps compact enough to fit the viewport rather than
  forcing a wide horizontal rail.

## Structure

`packages/app/src/routes/_authenticated.quiz.tsx` owns the training layouts.
`packages/app/src/components/study/study-visual.tsx` owns visual diagrams. The
work stays in those two places; it does not change flashcard data, progress, or
server functions.

## Checks

- Inspect the study page at 320px, 375px, and desktop widths.
- Check all three decks, the algorithm lesson list, lesson cards, code recipe,
  and diagrams.
- Run formatting, TypeScript, tests, and a production build.
