import { afterAll, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { createSessionCookie, hasValidSession, signIn } from "./auth";

const originalEnvironment = {
	username: process.env.APP_USERNAME,
	password: process.env.APP_PASSWORD,
	sessionSecret: process.env.APP_SESSION_SECRET,
};

process.env.APP_USERNAME = "andrew";
process.env.APP_PASSWORD = "correct-horse-battery-staple";
process.env.APP_SESSION_SECRET = "a-test-session-secret-that-is-long-enough";

afterAll(() => {
	if (originalEnvironment.username === undefined)
		delete process.env.APP_USERNAME;
	else process.env.APP_USERNAME = originalEnvironment.username;

	if (originalEnvironment.password === undefined)
		delete process.env.APP_PASSWORD;
	else process.env.APP_PASSWORD = originalEnvironment.password;

	if (originalEnvironment.sessionSecret === undefined) {
		delete process.env.APP_SESSION_SECRET;
	} else {
		process.env.APP_SESSION_SECRET = originalEnvironment.sessionSecret;
	}
});

test("creates a session that can be verified from its cookie", async () => {
	const session = await Effect.runPromise(
		signIn({
			username: "andrew",
			password: "correct-horse-battery-staple",
		}),
	);

	const cookie = createSessionCookie(session);

	expect(cookie).toContain("HttpOnly");
	expect(cookie).toContain("SameSite=Lax");
	expect(cookie).toContain("Max-Age=1209600");
	expect(await Effect.runPromise(hasValidSession(cookie))).toBe(true);
});

test("rejects an incorrect password without producing a session", async () => {
	const result = await Effect.runPromiseExit(
		signIn({
			username: "andrew",
			password: "not-the-password",
		}),
	);

	expect(Exit.isFailure(result)).toBe(true);
});

test("rejects a tampered session", async () => {
	const session = await Effect.runPromise(
		signIn({
			username: "andrew",
			password: "correct-horse-battery-staple",
		}),
	);

	expect(
		await Effect.runPromise(
			hasValidSession(`abyrd_app_session=${session.token}tampered`),
		),
	).toBe(false);
});
