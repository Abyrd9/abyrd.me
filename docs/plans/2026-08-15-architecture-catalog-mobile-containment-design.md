# Architecture catalog mobile containment

## Goal

Keep the authenticated study screens within the viewport at a 320px width. Wide diagrams may scroll inside their own card, but the document must never gain a horizontal scrollbar.

## Approach

The authenticated layout, study route, deck grid, and content cards each receive an explicit `min-w-0` boundary. The desktop deck grid uses `minmax(0, 1fr)` for its content column, so an unbreakable child cannot widen the grid track. The visual card and its diagram scroller are capped at the available width; the diagram remains readable by scrolling only inside that card. The shared app navigation wraps gracefully when all links cannot share one narrow row.

## Verification

Run the app typecheck and production build. Inspect the catalog at a narrow viewport and confirm the page's `scrollWidth` equals its viewport width while a wide diagram can still scroll within its card.
