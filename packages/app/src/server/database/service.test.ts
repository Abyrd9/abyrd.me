import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { createDatabase } from "./service";

test("opens a configured SQLite database with safe settings", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-app-database-"));
	const databasePath = join(directory, "app.sqlite");

	try {
		const database = await Effect.runPromise(
			createDatabase({
				databasePath,
				migrationsFolder: join(directory, "migrations"),
			}),
		);

		const foreignKeys = database.client.$client
			.query("PRAGMA foreign_keys;")
			.get() as { foreign_keys: number };

		expect(foreignKeys.foreign_keys).toBe(1);
		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});
