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
	setKindleBookArchived,
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
					coverUrl: "https://m.media-amazon.com/images/I/cover.jpg",
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
		expect(
			loadKindleLibrary(database.client, true).annotations[0]?.coverUrl,
		).toBe("https://m.media-amazon.com/images/I/cover.jpg");
		expect(loadKindleLibrary(database.client).annotations).toHaveLength(0);
		expect(loadKindleLibrary(database.client, true).annotations).toHaveLength(
			1,
		);
		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});

test("archives and restores every annotation in a book", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-kindle-"));
	try {
		const database = await Effect.runPromise(
			createDatabase({
				databasePath: join(directory, "app.sqlite"),
				migrationsFolder: join(process.cwd(), "drizzle"),
			}),
		);
		importKindleBooks(database.client, {
			books: [
				{
					asin: "archived-book",
					title: "Archived book",
					author: "An author",
					lastAnnotatedAt: "",
					annotations: [
						{ highlight: "First highlight", location: "10" },
						{ highlight: "Second highlight", location: "20" },
					],
				},
				{
					asin: "visible-book",
					title: "Visible book",
					author: "Another author",
					lastAnnotatedAt: "",
					annotations: [{ highlight: "Still visible", location: "30" }],
				},
			],
			errors: [],
		});

		setKindleBookArchived(database.client, "archived-book", true);
		expect(
			loadKindleLibrary(database.client).annotations.map(
				(annotation) => annotation.bookAsin,
			),
		).toEqual(["visible-book"]);
		expect(loadKindleLibrary(database.client, true).annotations).toHaveLength(
			2,
		);

		setKindleBookArchived(database.client, "archived-book", false);
		expect(loadKindleLibrary(database.client).annotations).toHaveLength(3);
		expect(loadKindleLibrary(database.client, true).annotations).toHaveLength(
			0,
		);
		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});
