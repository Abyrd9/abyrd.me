import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { z } from "zod";
import { hasValidSession } from "./auth";
import {
	getCurrentBriefings,
	getInterviewCatalog,
	getInterviewGuide,
	getInterviewNumbers,
	getInterviewRehearsal,
} from "./interview";

const rehearsalInput = z.object({
	rehearsalId: z.string().min(1),
});

export const loadInterviewCatalog = createServerFn({ method: "GET" }).handler(
	async () => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(getInterviewCatalog());
	},
);

export const loadInterviewRehearsal = createServerFn({ method: "GET" })
	.validator((input: unknown) => rehearsalInput.parse(input))
	.handler(async ({ data }) => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(
			getInterviewRehearsal(data.rehearsalId).pipe(Effect.orDie),
		);
	});

export const loadInterviewGuide = createServerFn({ method: "POST" })
	.validator((input: unknown) => rehearsalInput.parse(input))
	.handler(async ({ data }) => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(
			getInterviewGuide(data.rehearsalId).pipe(Effect.orDie),
		);
	});

export const loadCurrentBriefings = createServerFn({ method: "GET" }).handler(
	async () => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(getCurrentBriefings());
	},
);

export const loadInterviewNumbers = createServerFn({ method: "GET" }).handler(
	async () => {
		await _requireSignedIn();
		_setNoStore();

		return Effect.runPromise(getInterviewNumbers());
	},
);

async function _requireSignedIn() {
	const isSignedIn = await Effect.runPromise(
		hasValidSession(getRequestHeader("cookie")).pipe(Effect.orDie),
	);

	if (!isSignedIn) throw new Response("Unauthorized", { status: 401 });
}

function _setNoStore() {
	setResponseHeader("Cache-Control", "no-store");
}
