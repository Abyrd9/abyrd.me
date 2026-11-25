import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { createDatabase } from "./database/service";
import { extractNoteLinks } from "./note-links";
import {
	createNote,
	deleteNote,
	listNotes,
	loadNote,
	moveNote,
	NotePlacementError,
	reorderNote,
	searchNotes,
	updateNote,
} from "./writing-notes";
import {
	createChapter,
	createWriting,
	deleteChapter,
	updateChapter,
} from "./writings";

type Db = Awaited<ReturnType<typeof open>>["client"];

const open = (directory: string) =>
	Effect.runPromise(
		createDatabase({
			databasePath: join(directory, "app.sqlite"),
			migrationsFolder: join(process.cwd(), "drizzle"),
		}),
	);

const withDatabase = async (run: (db: Db) => void) => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-notes-"));
	const database = await open(directory);
	try {
		run(database.client);
	} finally {
		database.client.$client.close(false);
		rmSync(directory, { force: true, recursive: true });
	}
};

/** Saved Lexical JSON with one paragraph per entry; numbers become wiki links. */
const doc = (...paragraphs: Array<Array<string | number>>) =>
	JSON.stringify({
		root: {
			type: "root",
			children: paragraphs.map((parts) => ({
				type: "paragraph",
				children: parts.map((part) =>
					typeof part === "number"
						? { type: "wiki-link", noteId: part, title: `Note ${part}` }
						: { type: "text", text: part },
				),
			})),
		},
	});

test("builds nested trees in a writing and its chapters", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const characters = createNote(db, {
			writingId: book.id,
			title: "Characters",
		});
		const mara = createNote(db, {
			writingId: book.id,
			parentId: characters.id,
			title: "Mara",
		});
		const beats = createNote(db, {
			writingId: book.id,
			chapterId: book.firstChapterId,
			title: "Beats",
		});

		// The list is flat; the binder builds the tree from parentId.
		expect(
			listNotes(db, book.id)
				.map((note) => note.title)
				.sort(),
		).toEqual(["Beats", "Characters", "Mara"]);
		expect(mara).toMatchObject({ parentId: characters.id, chapterId: null });
		expect(beats.chapterId).toBe(book.firstChapterId);

		// A child under a chapter note takes that chapter, whatever was asked.
		const beat = createNote(db, {
			writingId: book.id,
			parentId: beats.id,
			title: "Opening beat",
		});
		expect(beat.chapterId).toBe(book.firstChapterId);

		const note = loadNote(db, beat.id);
		expect(note?.writing.title).toBe("Book");
		expect(note?.chapter?.id).toBe(book.firstChapterId);
		expect(note?.ancestors.map((ancestor) => ancestor.title)).toEqual([
			"Beats",
		]);

		const other = createWriting(db, "Other", 2);
		expect(() =>
			createNote(db, {
				writingId: other.id,
				parentId: characters.id,
				title: "x",
			}),
		).toThrow(NotePlacementError);
		expect(() =>
			createNote(db, {
				writingId: other.id,
				chapterId: book.firstChapterId,
				title: "x",
			}),
		).toThrow(NotePlacementError);
	}));

test("moves, reorders, and deletes notes with everything beneath them", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const second = createChapter(db, book.id, 2);
		const a = createNote(db, { writingId: book.id, title: "A" });
		const b = createNote(db, { writingId: book.id, title: "B" });
		const child = createNote(db, {
			writingId: book.id,
			parentId: a.id,
			title: "A1",
		});
		const grandchild = createNote(db, {
			writingId: book.id,
			parentId: child.id,
			title: "A1a",
		});

		expect(reorderNote(db, b.id, "earlier")).toBe(true);
		expect(
			listNotes(db, book.id)
				.filter((note) => note.parentId === null)
				.map((note) => note.title),
		).toEqual(["B", "A"]);
		expect(reorderNote(db, b.id, "earlier")).toBe(false);

		// Moving into its own subtree would create a loop.
		expect(() =>
			moveNote(db, a.id, { chapterId: null, parentId: grandchild.id }),
		).toThrow(NotePlacementError);

		// Moving to a chapter carries the whole subtree into that chapter.
		moveNote(db, a.id, { chapterId: second.id, parentId: null });
		const moved = listNotes(db, book.id).filter(
			(note) => note.chapterId === second.id,
		);
		expect(moved.map((note) => note.title).sort()).toEqual(["A", "A1", "A1a"]);

		moveNote(db, b.id, { chapterId: null, parentId: grandchild.id });
		expect(loadNote(db, b.id)).toMatchObject({
			parentId: grandchild.id,
			chapterId: second.id,
		});

		expect(deleteNote(db, child.id)).toBe(true);
		expect(listNotes(db, book.id).map((note) => note.title)).toEqual(["A"]);
	}));

test("deleting a chapter deletes its notes but keeps the writing's", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const second = createChapter(db, book.id, 2);
		createNote(db, { writingId: book.id, title: "World" });
		const scene = createNote(db, {
			writingId: book.id,
			chapterId: second.id,
			title: "Scene",
		});
		createNote(db, { writingId: book.id, parentId: scene.id, title: "Detail" });

		expect(deleteChapter(db, second.id)).toBe(true);
		expect(listNotes(db, book.id).map((note) => note.title)).toEqual(["World"]);
	}));

test("extracts each linked note once, with the text of its block", () => {
	const content = JSON.stringify({
		root: {
			children: [
				{
					type: "paragraph",
					children: [
						{ type: "text", text: "Ask " },
						{ type: "wiki-link", noteId: 7, title: "Mara" },
						{ type: "text", text: " about the  river." },
					],
				},
				{
					type: "list",
					children: [
						{
							type: "listitem",
							children: [{ type: "text", text: "Unrelated" }],
						},
						{
							type: "listitem",
							children: [
								{ type: "wiki-link", noteId: 9, title: "Bridge" },
								{ type: "text", text: " was old" },
							],
						},
					],
				},
				{
					type: "paragraph",
					children: [{ type: "wiki-link", noteId: 7, title: "Mara" }],
				},
				{
					type: "paragraph",
					children: [{ type: "wiki-link", noteId: "7", title: "x" }],
				},
			],
		},
	});

	expect(extractNoteLinks(content)).toEqual([
		{ targetNoteId: 7, context: "Ask Mara about the river." },
		{ targetNoteId: 9, context: "Bridge was old" },
	]);
	expect(extractNoteLinks(null)).toEqual([]);
	expect(extractNoteLinks("not json")).toEqual([]);
});

test("tracks links from chapters and notes across writings as backlinks", () =>
	withDatabase((db) => {
		const book = createWriting(db, "The Salt Road", 1);
		const other = createWriting(db, "Small Hours", 2);
		const mara = createNote(db, { writingId: book.id, title: "Mara" });
		const theme = createNote(db, { writingId: other.id, title: "Theme" });

		updateChapter(db, book.firstChapterId, {
			content: doc(["Mara ", mara.id, " crossed the river."]),
		});
		updateNote(db, theme.id, {
			content: doc(
				["Like ", mara.id, ", every character is leaving."],
				[theme.id],
				[999],
			),
		});

		const backlinks = loadNote(db, mara.id)?.backlinks ?? [];
		expect(backlinks).toHaveLength(2);
		expect(backlinks).toContainEqual(
			expect.objectContaining({
				kind: "chapter",
				id: book.firstChapterId,
				writingTitle: "The Salt Road",
				context: `Mara Note ${mara.id} crossed the river.`,
			}),
		);
		expect(backlinks).toContainEqual(
			expect.objectContaining({
				kind: "note",
				id: theme.id,
				writingTitle: "Small Hours",
			}),
		);
		// A note's link to itself, and links to missing notes, aren't stored.
		expect(loadNote(db, theme.id)?.backlinks).toEqual([]);

		// Saving again replaces the old links rather than adding to them.
		updateChapter(db, book.firstChapterId, { content: doc(["No links now."]) });
		expect(loadNote(db, mara.id)?.backlinks).toHaveLength(1);

		// Deleting the linking note removes its links.
		deleteNote(db, theme.id);
		expect(loadNote(db, mara.id)?.backlinks).toEqual([]);
	}));

test("searches note titles across writings, current writing first", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const other = createWriting(db, "Other", 2);
		createNote(db, { writingId: other.id, title: "River crossing" }, 10);
		createNote(db, { writingId: book.id, title: "The river" }, 5);
		createNote(db, { writingId: book.id, title: "100% true" }, 6);

		expect(searchNotes(db, "river", book.id).map((note) => note.title)).toEqual(
			["The river", "River crossing"],
		);
		expect(searchNotes(db, "river", other.id)[0]?.writingTitle).toBe("Other");
		// % and _ are matched literally.
		expect(searchNotes(db, "%", book.id).map((note) => note.title)).toEqual([
			"100% true",
		]);
	}));
