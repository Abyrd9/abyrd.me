import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { z } from "zod";
import { hasValidSession } from "./auth";
import { loadKindleSyncSecret } from "./database/config";
import { AppDatabase, AppDatabaseLive } from "./database/service";
import {
	loadKindleLibrary as readKindleLibrary,
	setKindleAnnotationArchived,
	setKindleBookArchived,
} from "./kindle";

const archiveSchema = z.object({
	id: z.number().int().positive(),
	archived: z.boolean(),
});

const bookArchiveSchema = z.object({
	asin: z.string().trim().min(1).max(100),
	archived: z.boolean(),
});

const requireSignedIn = Effect.gen(function* () {
	const isSignedIn = yield* hasValidSession(getRequestHeader("cookie"));
	if (!isSignedIn)
		return yield* Effect.fail(new Response("Unauthorized", { status: 401 }));
});

const withDatabase = <A, E>(effect: Effect.Effect<A, E, AppDatabase>) =>
	effect.pipe(Effect.provide(AppDatabaseLive));

export const loadKindleLibrary = createServerFn({ method: "GET" }).handler(
	async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				return readKindleLibrary(database.client);
			}).pipe(withDatabase, Effect.orDie),
		);
		setResponseHeader("Cache-Control", "no-store");
		return result;
	},
);

export const loadArchivedKindleLibrary = createServerFn({
	method: "GET",
}).handler(async () => {
	return Effect.runPromise(
		Effect.gen(function* () {
			yield* requireSignedIn;
			const database = yield* AppDatabase;
			return readKindleLibrary(database.client, true);
		}).pipe(withDatabase, Effect.orDie),
	);
});

export const loadKindleSetup = createServerFn({ method: "GET" }).handler(
	async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				return { syncToken: yield* loadKindleSyncSecret };
			}).pipe(Effect.orDie),
		);
		setResponseHeader("Cache-Control", "no-store");
		return result;
	},
);

export const updateKindleArchive = createServerFn({ method: "POST" })
	.validator((input: unknown) => archiveSchema.parse(input))
	.handler(async ({ data }) => {
		await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				setKindleAnnotationArchived(database.client, data.id, data.archived);
			}).pipe(withDatabase, Effect.orDie),
		);
		setResponseHeader("Cache-Control", "no-store");
		return { ok: true as const };
	});

export const updateKindleBookArchive = createServerFn({ method: "POST" })
	.validator((input: unknown) => bookArchiveSchema.parse(input))
	.handler(async ({ data }) => {
		await Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSignedIn;
				const database = yield* AppDatabase;
				setKindleBookArchived(database.client, data.asin, data.archived);
			}).pipe(withDatabase, Effect.orDie),
		);
		setResponseHeader("Cache-Control", "no-store");
		return { ok: true as const };
	});
