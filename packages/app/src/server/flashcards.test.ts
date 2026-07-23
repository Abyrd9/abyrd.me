import { expect, test } from "bun:test";
import { Effect } from "effect";
import { getFlashcardDecks } from "./flashcards";

test("loads clear system design term cards", async () => {
	const decks = await Effect.runPromise(getFlashcardDecks());

	expect(decks.systemTerms).toHaveLength(32);
	expect(
		decks.systemTerms.find((card) => card.id === "idempotency")?.definition,
	).toContain("repeating");
	expect(decks.systemTerms.every((card) => card.category === "concept")).toBe(
		true,
	);
});

test("loads architecture patterns with practical guidance", async () => {
	const decks = await Effect.runPromise(getFlashcardDecks());

	expect(decks.architecturePatterns).toHaveLength(36);
	const cqrs = decks.architecturePatterns.find((card) => card.id === "cqrs");
	expect(cqrs?.solves).toBeTruthy();
	expect(cqrs?.useWhen).toBeTruthy();
	expect(cqrs?.tradeoff).toBeTruthy();
	expect(
		decks.architecturePatterns.some(
			(card) => card.architectureType === "style",
		),
	).toBe(true);
	expect(
		decks.architecturePatterns.some(
			(card) => card.architectureType === "pattern",
		),
	).toBe(true);
	for (const card of decks.architecturePatterns) {
		expect(card.description).toBeTruthy();
		expect(card.useWhen).toBeTruthy();
		expect(card.tradeoff).toBeTruthy();
		expect(card.example).toBeTruthy();
	}

	const requiredIds = [
		"event-driven",
		"hexagonal",
		"layered",
		"microkernel",
		"pipes-and-filters",
		"microservices",
		"modular-monolith",
		"service-oriented",
		"service-based",
		"space-based",
		"inbox-outbox",
		"queue-based",
		"backend-for-frontend",
		"public-published-interfaces",
		"asynchronous-messaging",
		"batch-request",
		"blackboard",
		"circuit-breaker-pattern",
		"client-server",
		"competing-consumers",
		"model-view-controller",
		"claim-check",
		"peer-to-peer",
		"publish-subscribe-pattern",
		"rate-limiting-pattern",
		"request-response",
		"retry-pattern",
		"rule-based",
		"saga",
		"strangler-fig",
		"throttling",
	];
	const cardIds = new Set(decks.architecturePatterns.map((card) => card.id));
	for (const id of requiredIds) expect(cardIds.has(id)).toBe(true);
});

test("loads TypeScript and Go cards for every algorithm", async () => {
	const decks = await Effect.runPromise(getFlashcardDecks());

	expect(decks.algorithms).toHaveLength(10);
	for (const algorithm of decks.algorithms) {
		expect(
			algorithm.cards.find((card) => card.language === "TypeScript")?.code,
		).toBeTruthy();
		expect(
			algorithm.cards.find((card) => card.language === "Go")?.code,
		).toBeTruthy();
	}
});
