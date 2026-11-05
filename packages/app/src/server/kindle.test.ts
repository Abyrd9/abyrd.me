import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import {
	kindleAnnotations,
	kindleBooks,
	kindleChapters,
} from "./database/schema";
import { createDatabase } from "./database/service";
import {
	importKindleBooks,
	loadKindleLibrary,
	setKindleAnnotationArchived,
	setKindleBookArchived,
} from "./kindle";

test("keeps personal notes and chapter assignments through repeated imports", async () => {
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
					title: "Book",
					author: "Author",
					lastAnnotatedAt: "",
					annotations: [{ highlight: "Highlight", location: "1" }],
				},
			],
			errors: [],
		};
		importKindleBooks(database.client, imported);
		const chapter = database.client
			.insert(kindleChapters)
			.values({
				bookAsin: "book",
				title: "Chapter",
				position: 0,
				synopsis: "chapter synopsis",
			})
			.returning()
			.get();
		database.client
			.update(kindleBooks)
			.set({ synopsis: "book synopsis" })
			.where(eq(kindleBooks.asin, "book"))
			.run();
		database.client
			.update(kindleAnnotations)
			.set({ chapterId: chapter.id, commentary: "personal thought" })
			.run();
		importKindleBooks(database.client, imported);
		const library = loadKindleLibrary(database.client);
		expect(library.books[0]?.synopsis).toBe("book synopsis");
		expect(library.chapters[0]?.synopsis).toBe("chapter synopsis");
		expect(library.annotations[0]?.commentary).toBe("personal thought");
		expect(library.annotations[0]?.chapterId).toBe(chapter.id);
		setKindleBookArchived(database.client, "book", true);
		importKindleBooks(database.client, {
			...imported,
			books: [
				{
					...imported.books[0],
					annotations: [
						...imported.books[0].annotations,
						{ highlight: "New highlight", location: "2" },
					],
				},
			],
		});
		expect(loadKindleLibrary(database.client).annotations).toHaveLength(0);
		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});

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

test("restoring a book preserves highlights archived individually", async () => {
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
					asin: "book",
					title: "Book",
					author: "Author",
					lastAnnotatedAt: "",
					annotations: [
						{ highlight: "Hidden", location: "1" },
						{ highlight: "Visible", location: "2" },
					],
				},
			],
			errors: [],
		});
		const annotations = loadKindleLibrary(database.client).annotations;
		const hidden = annotations.find((item) => item.highlight === "Hidden");
		if (!hidden) throw new Error("Expected highlight");
		setKindleAnnotationArchived(database.client, hidden.id, true);
		setKindleBookArchived(database.client, "book", true);
		expect(loadKindleLibrary(database.client, true).annotations).toHaveLength(
			2,
		);
		setKindleBookArchived(database.client, "book", false);
		expect(
			loadKindleLibrary(database.client).annotations.map(
				(item) => item.highlight,
			),
		).toEqual(["Visible"]);
		expect(
			loadKindleLibrary(database.client, true).annotations.map(
				(item) => item.highlight,
			),
		).toEqual(["Hidden"]);
		database.client.$client.close(false);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});
