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

	expect(decks.architecturePatterns).toHaveLength(12);
	const cqrs = decks.architecturePatterns.find((card) => card.id === "cqrs");
	expect(cqrs?.solves).toBeTruthy();
	expect(cqrs?.useWhen).toBeTruthy();
	expect(cqrs?.tradeoff).toBeTruthy();
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
