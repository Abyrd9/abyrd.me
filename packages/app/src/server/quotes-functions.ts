import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { z } from "zod";
import { hasValidSession } from "./auth";
import { AppDatabase, AppDatabaseLive } from "./database/service";
import {
	updateQuote as editQuote,
	createQuote as insertQuote,
	quoteFieldsSchema,
	quoteInput,
	loadQuotes as readQuotes,
	deleteQuote as removeQuote,
} from "./quotes";

const quoteIdSchema = z.object({ id: z.number().int().positive() });
const updateQuoteSchema = quoteFieldsSchema.extend({
	id: z.number().int().positive(),
});

const requireSignedIn = Effect.gen(function* () {
	const isSignedIn = yield* hasValidSession(getRequestHeader("cookie"));

	if (!isSignedIn)
		return yield* Effect.fail(new Response("Unauthorized", { status: 401 }));
});

const withDatabase = <A, E>(effect: Effect.Effect<A, E, AppDatabase>) =>
	effect.pipe(Effect.provide(AppDatabaseLive));

export const loadQuotes = createServerFn({ method: "GET" }).handler(
	async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				return readQuotes(database.client);
			}).pipe(withDatabase, Effect.orDie),
		);

		setResponseHeader("Cache-Control", "no-store");
		return result;
	},
);

export const createQuote = createServerFn({ method: "POST" })
	.validator((input: unknown) => quoteFieldsSchema.parse(input))
	.handler(async ({ data }) => {
		const quote = await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				return insertQuote(database.client, quoteInput(data));
			}).pipe(withDatabase, Effect.orDie),
		);

		setResponseHeader("Cache-Control", "no-store");
		return quote;
	});

export const updateQuote = createServerFn({ method: "POST" })
	.validator((input: unknown) => updateQuoteSchema.parse(input))
	.handler(async ({ data }) => {
		const quote = await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				return editQuote(database.client, data.id, quoteInput(data));
			}).pipe(withDatabase, Effect.orDie),
		);

		setResponseHeader("Cache-Control", "no-store");
		return quote;
	});

export const deleteQuote = createServerFn({ method: "POST" })
	.validator((input: unknown) => quoteIdSchema.parse(input))
	.handler(async ({ data }) => {
		await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				removeQuote(database.client, data.id);
			}).pipe(withDatabase, Effect.orDie),
		);

		setResponseHeader("Cache-Control", "no-store");
		return { ok: true as const };
	});
