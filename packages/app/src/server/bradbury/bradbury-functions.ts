import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { hasValidSession } from "../auth";
import { getBradburyEdition } from "./readings";

export const getBradburyReadings = createServerFn({ method: "GET" }).handler(
	async () => {
		setResponseHeader("Cache-Control", "no-store");
		const isSignedIn = await Effect.runPromise(
			hasValidSession(getRequestHeader("cookie")).pipe(Effect.orDie),
		);
		if (!isSignedIn) throw new Response("Unauthorized", { status: 401 });

		return getBradburyEdition(new Date());
	},
);
