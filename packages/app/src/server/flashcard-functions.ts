import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { hasValidSession } from "./auth";
import { getFlashcardDecks } from "./flashcards";

export const loadFlashcardDecks = createServerFn({ method: "GET" }).handler(
	async () => {
		const isSignedIn = await Effect.runPromise(
			hasValidSession(getRequestHeader("cookie")).pipe(Effect.orDie),
		);
		if (!isSignedIn) throw new Response("Unauthorized", { status: 401 });

		setResponseHeader("Cache-Control", "no-store");
		return Effect.runPromise(getFlashcardDecks());
	},
);
