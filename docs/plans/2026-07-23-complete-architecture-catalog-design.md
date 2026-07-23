# Complete Architecture Catalog Design

## Goal

Turn the architecture-pattern deck into a complete study catalog that covers
the distinct software architecture styles and patterns listed on the selected
Wikipedia page.

## User experience

The current Architecture patterns deck will become Architecture catalog. Each
card will show a Style or Pattern label. Search results will use the same label
so Andrew can tell whether he found a whole-system structure or a focused
solution to one recurring problem.

Each card will keep the same study shape: what it is, what it solves, when to
use it, its main cost or risk, and an example.

## Content

The catalog will cover every distinct item in the selected list. Existing cards
such as client-server, layered, microservices, event-driven, queue-based load
leveling, and peer-to-peer will be retained and classified rather than copied.

New cards will cover styles such as hexagonal, microkernel, modular monolith,
service-oriented, service-based, and space-based architecture. They will also
cover patterns such as inbox/outbox, backend for frontend, public versus
published interfaces, batch request, blackboard, competing consumers, MVC,
claim check, request-response, rule-based, saga, strangler fig, and throttling.

The Wikipedia list is a coverage checklist. The app will use original,
plain-language text and include the page as further reading.

## Architecture

`ArchitecturePatternCard` will add an `architectureType` field with either
`style` or `pattern`. The client route will use that field for card and search
labels. The existing global search and filters will continue to work without a
new endpoint.

## Error handling and tests

The existing load error stays in place. Tests will check that both labels exist
and that every new catalog card has a description, use case, risk, and example.

`bun run check` will run tests, formatting, types, and production builds. A
browser smoke test will cover a style, a pattern, and a search result.
