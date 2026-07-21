import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Config, Data, Effect, Redacted } from "effect";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;
const SESSION_VERSION = "v1";

const appCredentials = Config.all({
	username: Config.string("APP_USERNAME"),
	password: Config.redacted("APP_PASSWORD"),
	sessionSecret: Config.redacted(
		Config.string("APP_SESSION_SECRET").pipe(
			Config.validate({
				message: "APP_SESSION_SECRET must be at least 32 characters long",
				validation: (value) => value.length >= 32,
			}),
		),
	),
});

type AppCredentials = Effect.Effect.Success<typeof appCredentials>;

export class InvalidCredentials extends Data.TaggedError(
	"InvalidCredentials",
) {}

export type SignInInput = {
	readonly username: string;
	readonly password: string;
};

export type Session = {
	readonly expiresAt: Date;
	readonly token: string;
};

export const signIn = (input: SignInInput) =>
	Effect.gen(function* () {
		const credentials = yield* appCredentials;

		if (!hasMatchingCredentials(input, credentials)) {
			return yield* new InvalidCredentials();
		}

		const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1_000);
		const token = createSessionToken(
			expiresAt,
			Redacted.value(credentials.sessionSecret),
		);

		return { expiresAt, token } satisfies Session;
	});

export const hasValidSession = (cookieHeader: string | null | undefined) =>
	Effect.gen(function* () {
		const credentials = yield* appCredentials;
		const token = getCookie(cookieHeader, "abyrd_app_session");

		if (!token) return false;

		const [version, expiresAtText, signature] = token.split(".");
		const expiresAt = Number(expiresAtText);

		if (
			version !== SESSION_VERSION ||
			!signature ||
			!Number.isSafeInteger(expiresAt) ||
			expiresAt <= Date.now()
		) {
			return false;
		}

		const expected = createSessionToken(
			new Date(expiresAt),
			Redacted.value(credentials.sessionSecret),
		);

		return areEqual(token, expected);
	});

export function createSessionCookie(session: Session) {
	return [
		`abyrd_app_session=${session.token}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${SESSION_DURATION_SECONDS}`,
		...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
	].join("; ");
}

export function clearSessionCookie() {
	return "abyrd_app_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function hasMatchingCredentials(
	input: SignInInput,
	credentials: AppCredentials,
) {
	return (
		areEqual(input.username, credentials.username) &&
		areEqual(input.password, Redacted.value(credentials.password))
	);
}

function createSessionToken(expiresAt: Date, sessionSecret: string) {
	const value = `${SESSION_VERSION}.${expiresAt.getTime()}`;
	const signature = createHmac("sha256", sessionSecret)
		.update(value)
		.digest("base64url");

	return `${value}.${signature}`;
}

function getCookie(cookieHeader: string | null | undefined, name: string) {
	if (!cookieHeader) return null;

	for (const part of cookieHeader.split(";")) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) return value.join("=");
	}

	return null;
}

function areEqual(left: string, right: string) {
	const leftHash = createHash("sha256").update(left).digest();
	const rightHash = createHash("sha256").update(right).digest();

	return timingSafeEqual(leftHash, rightHash);
}
