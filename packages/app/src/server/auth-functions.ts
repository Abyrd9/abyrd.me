import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { Effect } from "effect";
import { z } from "zod";
import {
	clearSessionCookie,
	createSessionCookie,
	hasValidSession,
	signIn,
} from "./auth";

const signInSchema = z.object({
	username: z.string().trim().min(1),
	password: z.string().min(1),
});

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const isSignedIn = await Effect.runPromise(
			hasValidSession(getRequestHeader("cookie")).pipe(Effect.orDie),
		);

		setResponseHeader("Cache-Control", "no-store");
		return { isSignedIn };
	},
);

export const submitSignIn = createServerFn({ method: "POST" })
	.validator((input: unknown) => signInSchema.parse(input))
	.handler(async ({ data }) => {
		const session = await Effect.runPromise(
			signIn(data).pipe(
				Effect.catchTag("InvalidCredentials", () => Effect.succeed(null)),
				Effect.orDie,
			),
		);

		setResponseHeader("Cache-Control", "no-store");

		if (!session) return { ok: false as const };

		setResponseHeader("Set-Cookie", createSessionCookie(session));
		return { ok: true as const };
	});

export const signOut = createServerFn({ method: "POST" }).handler(() => {
	setResponseHeader("Cache-Control", "no-store");
	setResponseHeader("Set-Cookie", clearSessionCookie());
	return { ok: true as const };
});
