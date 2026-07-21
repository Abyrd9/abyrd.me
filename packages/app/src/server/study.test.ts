import { expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
	evaluateStudyAnswer,
	getStudyCatalog,
	getStudyCourse,
	getStudySession,
	revealStudyQuestion,
} from "./study";

test("uses the same balanced daily set for the same date and attempt", async () => {
	const first = await Effect.runPromise(
		getStudySession({ date: "2026-07-21", attempt: 0 }),
	);
	const second = await Effect.runPromise(
		getStudySession({ date: "2026-07-21", attempt: 0 }),
	);

	expect(first).toEqual(second);
	expect(first.questions).toHaveLength(8);
	expect(new Set(first.questions.map((question) => question.topic)).size).toBe(
		4,
	);
	expect(new Set(first.questions.map((question) => question.kind)).size).toBe(
		4,
	);
});

test("creates a different practice set when the attempt changes", async () => {
	const first = await Effect.runPromise(
		getStudySession({ date: "2026-07-21", attempt: 1 }),
	);
	const second = await Effect.runPromise(
		getStudySession({ date: "2026-07-21", attempt: 2 }),
	);

	expect(first.id).not.toBe(second.id);
	expect(first.questions.map((question) => question.id)).not.toEqual(
		second.questions.map((question) => question.id),
	);
});

test("does not expose answers before a response is requested", async () => {
	const session = await Effect.runPromise(
		getStudySession({ date: "2026-07-21", attempt: 0 }),
	);
	const serialized = JSON.stringify(session);

	expect(serialized).not.toContain("correctOptionId");
	expect(serialized).not.toContain("referenceAnswer");
	expect(serialized).not.toContain("rubric");
	expect(serialized).not.toContain("explanation");
});

test("grades multiple choice answers and reveals typed-answer rubrics", async () => {
	const correct = await Effect.runPromise(
		evaluateStudyAnswer({
			questionId: "algorithms-window-choice",
			answer: "b",
		}),
	);
	const incorrect = await Effect.runPromise(
		evaluateStudyAnswer({
			questionId: "algorithms-window-choice",
			answer: "a",
		}),
	);
	const written = await Effect.runPromise(
		evaluateStudyAnswer({
			questionId: "algorithms-window-written",
			answer: "My explanation",
		}),
	);
	const flashcard = await Effect.runPromise(
		revealStudyQuestion("algorithms-window-invariant"),
	);

	expect(correct.correct).toBe(true);
	expect(incorrect.correct).toBe(false);
	expect(written.correct).toBeNull();
	expect(written.rubric.length).toBeGreaterThan(0);
	expect(flashcard.answer).toContain("no repeated letter");
});

test("loads declarative courses and their final assessments", async () => {
	const catalog = await Effect.runPromise(getStudyCatalog());
	const course = await Effect.runPromise(getStudyCourse("sliding-window"));

	expect(catalog.map((item) => item.id)).toEqual([
		"url-shortener",
		"sliding-window",
	]);
	expect(course.lessons).toHaveLength(4);
	expect(course.assessment).toHaveLength(3);
	expect(JSON.stringify(course)).not.toContain("correctOptionId");
});

test("reports unknown question and course IDs as typed failures", async () => {
	const questionExit = await Effect.runPromiseExit(
		revealStudyQuestion("missing-question"),
	);
	const courseExit = await Effect.runPromiseExit(
		getStudyCourse("missing-course"),
	);

	expect(Exit.isFailure(questionExit)).toBe(true);
	expect(Exit.isFailure(courseExit)).toBe(true);
});
