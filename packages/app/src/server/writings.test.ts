import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { createDatabase } from "./database/service";
import { createNote, loadNote, updateNote } from "./writing-notes";
import {
	contentRevision,
	createChapter,
	createWriting,
	deleteChapter,
	deleteWriting,
	listWritings,
	loadChapter,
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

test("a save from a stale version is refused and leaves the text alone", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const id = book.firstChapterId;
		const start = loadChapter(db, id)?.revision ?? "";
		expect(start).toBe(contentRevision(null));

		const first = updateChapter(db, id, {
			content: "agent",
			baseRevision: start,
		});
		expect(first).toMatchObject({
			conflict: false,
			revision: contentRevision("agent"),
		});

		// An editor still holding the original version tries to save.
		const stale = updateChapter(db, id, {
			content: "mine",
			baseRevision: start,
		});
		expect(stale).toMatchObject({ conflict: true, content: "agent" });
		expect(loadChapter(db, id)?.content).toBe("agent");

		// Titles and saves without a base version still go through.
		expect(updateChapter(db, id, { title: "One" })?.conflict).toBe(false);
		expect(updateChapter(db, id, { content: "forced" })?.conflict).toBe(false);

		const note = createNote(db, { writingId: book.id, title: "N" });
		const noteStart = loadNote(db, note.id)?.revision ?? "";
		updateNote(db, note.id, { content: "agent", baseRevision: noteStart });
		expect(
			updateNote(db, note.id, { content: "mine", baseRevision: noteStart }),
		).toMatchObject({ conflict: true, content: "agent" });
		expect(loadNote(db, note.id)?.content).toBe("agent");
	}));
