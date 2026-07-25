import { timingSafeEqual } from "node:crypto";
import { Effect } from "effect";
import {
	defineEventHandler,
	getHeader,
	readRawBody,
	setResponseStatus,
} from "h3";
import { loadKindleSyncSecret } from "#/server/database/config";
import { AppDatabase, AppDatabaseLive } from "#/server/database/service";
import { importKindleBooks, parseKindleImport } from "#/server/kindle";

const maxImportBytes = 20 * 1024 * 1024;

export default defineEventHandler(async (event) => {
	const authorization = getHeader(event, "authorization") ?? "";
	const token = authorization.startsWith("Bearer ")
		? authorization.slice(7)
		: "";
	const contentLength = Number(getHeader(event, "content-length") ?? 0);

	if (contentLength > maxImportBytes) {
		setResponseStatus(event, 413);
		return { error: "The import is too large." };
	}

	const body = await readRawBody(event);
	if (!body || body.length > maxImportBytes) {
		setResponseStatus(event, 413);
		return { error: "The import is too large." };
	}

	try {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const secret = yield* loadKindleSyncSecret;
				if (!tokensMatch(token, secret))
					return yield* Effect.fail("Invalid sync token.");
				const imported = yield* parseKindleImport(JSON.parse(body));
				const database = yield* AppDatabase;
				return importKindleBooks(database.client, imported);
			}).pipe(Effect.provide(AppDatabaseLive)),
		);
		return result;
	} catch (error) {
		setResponseStatus(event, 400);
		return {
			error: error instanceof Error ? error.message : "Invalid import.",
		};
	}
});

function tokensMatch(left: string, right: string) {
	const leftValue = Buffer.from(left);
	const rightValue = Buffer.from(right);
	return (
		leftValue.length === rightValue.length &&
		timingSafeEqual(leftValue, rightValue)
	);
}
