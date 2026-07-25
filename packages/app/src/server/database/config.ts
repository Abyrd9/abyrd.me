import { Config, Data, Effect, Redacted } from "effect";

const LOCAL_DATABASE_PATH = "./data/app.sqlite";

export type DatabaseConfig = {
	readonly databasePath: string;
	readonly migrationsFolder: string;
};

export class DatabaseConfigurationError extends Data.TaggedError(
	"DatabaseConfigurationError",
)<{
	readonly message: string;
}> {}

const appDatabasePath = Config.string("APP_DATABASE_PATH").pipe(
	Config.withDefault(LOCAL_DATABASE_PATH),
);

const kindleSyncSecret = Config.redacted(
	Config.string("APP_KINDLE_SYNC_SECRET"),
);

export const loadKindleSyncSecret = Effect.gen(function* () {
	return Redacted.value(yield* kindleSyncSecret);
});

export const loadDatabaseConfig = Effect.gen(function* () {
	const databasePath = yield* appDatabasePath;

	if (process.env.RAILWAY_ENVIRONMENT_NAME && !process.env.APP_DATABASE_PATH) {
		return yield* new DatabaseConfigurationError({
			message:
				"APP_DATABASE_PATH must be set in Railway (use /data/app.sqlite).",
		});
	}

	return {
		databasePath,
		migrationsFolder: `${process.cwd()}/drizzle`,
	} satisfies DatabaseConfig;
});
