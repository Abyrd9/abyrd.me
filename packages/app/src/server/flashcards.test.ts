import { expect, test } from "bun:test";
import { Effect } from "effect";
import { lessonStages } from "./algorithm-paths";
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

test("loads complete algorithm pattern paths", async () => {
	const decks = await Effect.runPromise(getFlashcardDecks());
	const lessons = decks.algorithmPaths.flatMap((path) => path.lessons);

	expect(decks.algorithmPaths).toHaveLength(5);
	expect(lessons).toHaveLength(29);
	expect(lessonStages).toEqual([
		"spot",
		"state",
		"write",
		"trace",
		"choose",
		"use",
		"check",
	]);
	expect(new Set(decks.algorithmPaths.map((path) => path.id)).size).toBe(5);
	expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(29);

	for (const lesson of lessons) {
		expect(lesson.spot).toBeTruthy();
		expect(lesson.state).toBeTruthy();
		expect(lesson.recipe.length).toBeGreaterThan(40);
		expect(lesson.trace).toBeTruthy();
		expect(lesson.choose).toBeTruthy();
		expect(lesson.problems).toHaveLength(3);
		expect(lesson.complexity).toBeTruthy();
		expect(lesson.mistake).toBeTruthy();
	}
});

test("covers every learning item with a valid interactive visual", async () => {
	const decks = await Effect.runPromise(getFlashcardDecks());
	const expectedKeys = [
		...decks.systemTerms.map((card) => `term:${card.id}`),
		...decks.architecturePatterns.map((card) => `architecture:${card.id}`),
		...decks.algorithmPaths.flatMap((path) =>
			path.lessons.map((lesson) => `algorithm:${lesson.id}`),
		),
	];

	expect(expectedKeys).toHaveLength(97);
	expect(Object.keys(decks.studyVisuals).sort()).toEqual(expectedKeys.sort());

	for (const [key, visual] of Object.entries(decks.studyVisuals)) {
		expect(visual.title.length).toBeGreaterThan(0);
		expect(visual.nodes.length).toBeGreaterThanOrEqual(2);
		expect(visual.frames.length).toBeGreaterThanOrEqual(2);

		const nodeIds = new Set(visual.nodes.map((node) => node.id));
		const edgeIds = new Set(visual.edges.map((edge) => edge.id));
		expect(nodeIds.size).toBe(visual.nodes.length);
		expect(edgeIds.size).toBe(visual.edges.length);

		for (const edge of visual.edges) {
			expect(nodeIds.has(edge.from)).toBe(true);
			expect(nodeIds.has(edge.to)).toBe(true);
		}

		for (const frame of visual.frames) {
			expect(frame.label.length).toBeGreaterThan(0);
			expect(frame.note.length).toBeGreaterThan(0);
			expect(frame.activeNodes.length).toBeGreaterThan(0);
			for (const id of frame.activeNodes) expect(nodeIds.has(id)).toBe(true);
			for (const id of frame.activeEdges ?? [])
				expect(edgeIds.has(id)).toBe(true);
		}

		expect(key).toMatch(/^(term|architecture|algorithm):/);
	}
});
