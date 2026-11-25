import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { hasValidSession } from "./auth";
import {
	AppDatabase,
	type AppDatabaseClient,
	AppDatabaseLive,
} from "./database/service";

/**
 * Runs a database read or write for a server function after checking the
 * session cookie. Import it only from server function handlers, which the
 * client build strips, so it never reaches the browser bundle.
 */
export const runSignedIn = async <A>(run: (db: AppDatabaseClient) => A) => {
	const result = await Effect.runPromise(
		Effect.gen(function* () {
			const isSignedIn = yield* hasValidSession(getRequestHeader("cookie"));
			if (!isSignedIn)
				return yield* Effect.fail(
					new Response("Unauthorized", { status: 401 }),
				);
			const database = yield* AppDatabase;
			return run(database.client);
		}).pipe(Effect.provide(AppDatabaseLive), Effect.orDie),
	);
	setResponseHeader("Cache-Control", "no-store");
	return result;
};
