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
	loadQuotes as readQuotes,
	deleteQuote as removeQuote,
} from "./quotes";

const quoteFieldsSchema = z.object({
	text: z.string().trim().min(1, "Enter a quote.").max(10_000),
	attribution: z.string().trim().max(500),
	sourceUrl: z
		.string()
		.trim()
		.max(2_048)
		.refine(_isHttpUrl, "Enter a valid web address."),
	sourceNote: z.string().trim().max(2_000),
});

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
				return insertQuote(database.client, _quoteInput(data));
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
				return editQuote(database.client, data.id, _quoteInput(data));
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

function _isHttpUrl(value: string) {
	if (!value) return true;
	if (!URL.canParse(value)) return false;

	const { protocol } = new URL(value);
	return protocol === "http:" || protocol === "https:";
}

function _quoteInput(data: z.infer<typeof quoteFieldsSchema>) {
	return {
		text: data.text,
		attribution: data.attribution || null,
		sourceUrl: data.sourceUrl || null,
		sourceNote: data.sourceNote || null,
	};
}
