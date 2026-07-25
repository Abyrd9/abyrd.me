import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { kindleAnnotations } from "./database/schema";
import { createDatabase } from "./database/service";
import {
	importKindleBooks,
	loadKindleLibrary,
	setKindleAnnotationArchived,
} from "./kindle";

test("preserves an archive decision across later Kindle imports", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-kindle-"));
	try {
		const database = await Effect.runPromise(
			createDatabase({
				databasePath: join(directory, "app.sqlite"),
				migrationsFolder: join(process.cwd(), "drizzle"),
			}),
		);
		const imported = {
			books: [
				{
					asin: "book",
					title: "A book",
					author: "An author",
					lastAnnotatedAt: "",
					annotations: [{ highlight: "Keep this", location: "10" }],
				},
			],
			errors: [],
		};
		importKindleBooks(database.client, imported);
		const annotation = database.client.select().from(kindleAnnotations).get();
		expect(annotation).toBeDefined();
		if (!annotation) throw new Error("Expected an imported annotation.");
		setKindleAnnotationArchived(database.client, annotation.id, true);
		importKindleBooks(database.client, imported);
		expect(loadKindleLibrary(database.client).annotations).toHaveLength(0);
		expect(loadKindleLibrary(database.client, true).annotations).toHaveLength(
			1,
		);
		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});
