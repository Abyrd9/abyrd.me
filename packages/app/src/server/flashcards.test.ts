import { expect, test } from "bun:test";
import { Effect } from "effect";
import { getFlashcardDecks } from "./flashcards";

test("loads clear system design term cards", async () => {
	const decks = await Effect.runPromise(getFlashcardDecks());

	expect(decks.systemTerms).toHaveLength(12);
	expect(
		decks.systemTerms.find((card) => card.id === "idempotency")?.definition,
	).toContain("repeating");
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
