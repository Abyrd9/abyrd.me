import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { createDatabase } from "./database/service";
import { createQuote, deleteQuote, loadQuotes, updateQuote } from "./quotes";

test("creates, edits, orders, and permanently deletes quotes", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-quotes-"));

	try {
		const database = await Effect.runPromise(
			createDatabase({
				databasePath: join(directory, "app.sqlite"),
				migrationsFolder: join(process.cwd(), "drizzle"),
			}),
		);

		const first = createQuote(database.client, {
			text: "First quote",
			createdAt: 1,
		});
		const second = createQuote(database.client, {
			text: "Second quote",
			attribution: "Someone",
			sourceNote: "A book",
			createdAt: 2,
		});

		expect(loadQuotes(database.client).map((quote) => quote.text)).toEqual([
			"Second quote",
			"First quote",
		]);

		updateQuote(database.client, first.id, {
			text: "Edited quote",
			sourceUrl: "https://example.com/quote",
			updatedAt: 3,
		});
		expect(loadQuotes(database.client)[1]).toMatchObject({
			text: "Edited quote",
			sourceUrl: "https://example.com/quote",
		});

		deleteQuote(database.client, second.id);
		expect(loadQuotes(database.client)).toHaveLength(1);

		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});
