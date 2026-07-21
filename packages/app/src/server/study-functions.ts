import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { z } from "zod";
import { hasValidSession } from "./auth";
import {
	evaluateStudyAnswer,
	getStudyCatalog,
	getStudyCourse,
	getStudySession,
	revealStudyQuestion,
} from "./study";

const sessionInput = z.object({
	date: z.string().date(),
	attempt: z.number().int().min(0).max(10_000),
});

const questionInput = z.object({
	questionId: z.string().min(1),
});

const answerInput = questionInput.extend({
	answer: z.string().trim().min(1).max(20_000),
});

const courseInput = z.object({
	courseId: z.string().min(1),
});

export const loadStudySession = createServerFn({ method: "GET" })
	.validator((input: unknown) => sessionInput.parse(input))
	.handler(async ({ data }) => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(getStudySession(data));
	});

export const loadStudyCatalog = createServerFn({ method: "GET" }).handler(
	async () => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(getStudyCatalog());
	},
);

export const loadStudyCourse = createServerFn({ method: "GET" })
	.validator((input: unknown) => courseInput.parse(input))
	.handler(async ({ data }) => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(getStudyCourse(data.courseId).pipe(Effect.orDie));
	});

export const revealStudyAnswer = createServerFn({ method: "POST" })
	.validator((input: unknown) => questionInput.parse(input))
	.handler(async ({ data }) => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(
			revealStudyQuestion(data.questionId).pipe(Effect.orDie),
		);
	});

export const submitStudyAnswer = createServerFn({ method: "POST" })
	.validator((input: unknown) => answerInput.parse(input))
	.handler(async ({ data }) => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(evaluateStudyAnswer(data).pipe(Effect.orDie));
	});

async function _requireSignedIn() {
	const isSignedIn = await Effect.runPromise(
		hasValidSession(getRequestHeader("cookie")).pipe(Effect.orDie),
	);

	if (!isSignedIn) throw new Response("Unauthorized", { status: 401 });
}

function _setNoStore() {
	setResponseHeader("Cache-Control", "no-store");
}
