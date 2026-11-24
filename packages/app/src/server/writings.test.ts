import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { createDatabase } from "./database/service";
import {
	createChapter,
	createWriting,
	deleteChapter,
	deleteWriting,
	listWritings,
	loadWriting,
	moveChapter,
	previewBlocks,
	updateChapter,
	updateWriting,
} from "./writings";

const withDatabase = async (
	run: (db: Awaited<ReturnType<typeof open>>["client"]) => void,
) => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-writings-"));
	const database = await open(directory);
	try {
		run(database.client);
	} finally {
		database.client.$client.close(false);
		rmSync(directory, { force: true, recursive: true });
	}
};

const open = (directory: string) =>
	Effect.runPromise(
		createDatabase({
			databasePath: join(directory, "app.sqlite"),
			migrationsFolder: join(process.cwd(), "drizzle"),
		}),
	);

test("creates writings with a first chapter and lists them by last edit", () =>
	withDatabase((db) => {
		const essay = createWriting(db, "Essay", 1);
		const book = createWriting(db, "Book", 2);
		expect(loadWriting(db, essay.id)?.chapters).toHaveLength(1);

		updateChapter(
			db,
			essay.firstChapterId,
			{ content: "{}", wordCount: 120 },
			3,
		);
		const list = listWritings(db);
		expect(list.map((writing) => writing.title)).toEqual(["Essay", "Book"]);
		expect(list[0]).toMatchObject({ chapterCount: 1, wordCount: 120 });
		expect(list[1]).toMatchObject({ id: book.id, wordCount: 0 });

		updateWriting(db, book.id, { title: "Novel", pageSize: "pocket" }, 4);
		expect(listWritings(db)[0]).toMatchObject({
			title: "Novel",
			pageSize: "pocket",
		});

		deleteWriting(db, book.id);
		expect(listWritings(db)).toHaveLength(1);
		expect(loadWriting(db, book.id)).toBeNull();
	}));

test("adds, reorders, and deletes chapters but keeps the last one", () =>
	withDatabase((db) => {
		const { id, firstChapterId } = createWriting(db, "Book", 1);
		const second = createChapter(db, id, 2);
		const third = createChapter(db, id, 3);
		const order = () => loadWriting(db, id)?.chapters.map((c) => c.id);

		expect(order()).toEqual([firstChapterId, second.id, third.id]);
		expect(moveChapter(db, third.id, "earlier")).toBe(true);
		expect(order()).toEqual([firstChapterId, third.id, second.id]);
		expect(moveChapter(db, firstChapterId, "earlier")).toBe(false);

		expect(deleteChapter(db, third.id)).toBe(true);
		expect(loadWriting(db, id)?.chapters.map((c) => c.position)).toEqual([
			0, 1,
		]);
		expect(deleteChapter(db, second.id)).toBe(true);
		expect(deleteChapter(db, firstChapterId)).toBe(false);
		expect(order()).toEqual([firstChapterId]);
	}));

test("previews the opening blocks of a saved chapter", () => {
	const block = (type: string, text: string) => ({
		type,
		children: [{ type: "text", text }],
	});
	const content = JSON.stringify({
		root: {
			children: [
				block("heading", "One"),
				block("paragraph", "  "),
				{
					type: "paragraph",
					children: [{ text: "It was " }, { text: "late." }],
				},
				block("quote", "x".repeat(700)),
			],
		},
	});

	const preview = previewBlocks(content);
	expect(preview.slice(0, 2)).toEqual([
		{ kind: "heading", text: "One" },
		{ kind: "paragraph", text: "It was late." },
	]);
	expect(preview[2].text.length).toBe(
		600 - "One".length - "It was late.".length,
	);
	expect(previewBlocks(null)).toEqual([]);
	expect(previewBlocks("not json")).toEqual([]);
});
