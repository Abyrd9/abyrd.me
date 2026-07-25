import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Context, Data, Effect, Layer } from "effect";
import { type DatabaseConfig, loadDatabaseConfig } from "./config";
import * as schema from "./schema";

export type AppDatabaseClient = ReturnType<typeof drizzle<typeof schema>>;

export type AppDatabaseService = {
	readonly client: AppDatabaseClient;
	readonly databasePath: string;
};

export class DatabaseStartupError extends Data.TaggedError(
	"DatabaseStartupError",
)<{
	readonly cause: unknown;
}> {}

export class AppDatabase extends Context.Tag("AppDatabase")<
	AppDatabase,
	AppDatabaseService
>() {}

let databaseService: AppDatabaseService | undefined;

export const createDatabase = (config: DatabaseConfig) =>
	Effect.try({
		try: () => {
			if (config.databasePath !== ":memory:") {
				mkdirSync(dirname(config.databasePath), { recursive: true });
			}

			const sqlite = new Database(config.databasePath, { create: true });
			sqlite.exec("PRAGMA journal_mode = WAL;");
			sqlite.exec("PRAGMA foreign_keys = ON;");
			sqlite.exec("PRAGMA busy_timeout = 5000;");

			const client = drizzle({ client: sqlite, schema });
			const migrationJournal = join(
				config.migrationsFolder,
				"meta",
				"_journal.json",
			);

			if (existsSync(migrationJournal)) {
				migrate(client, { migrationsFolder: config.migrationsFolder });
			}

			return {
				client,
				databasePath: config.databasePath,
			} satisfies AppDatabaseService;
		},
		catch: (cause) => new DatabaseStartupError({ cause }),
	});

export const initializeDatabase = Effect.suspend(() => {
	if (databaseService) return Effect.succeed(databaseService);

	return Effect.gen(function* () {
		const config = yield* loadDatabaseConfig;
		const service = yield* createDatabase(config);

		databaseService = service;
		return service;
	});
});

export const AppDatabaseLive = Layer.effect(AppDatabase, initializeDatabase);

// Future feature code should depend on AppDatabase through a repository module.
// Do not create another bun:sqlite connection outside this module.
