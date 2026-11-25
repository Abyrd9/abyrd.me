import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import {
	noteLinks,
	projects,
	writingChapters,
	writingNotes,
	writings,
} from "./database/schema";
import { createDatabase } from "./database/service";
import {
	createNote,
	deleteNote,
	keepUnsavedEdits,
	loadNote,
	moveNote,
	updateNote,
} from "./writing-notes";
import {
	deleteTrashItem,
	listTrash,
	purgeExpiredTrash,
	restoreTrashItem,
	TrashError,
	trashChapter,
	trashNote,
	trashWriting,
} from "./writing-trash";
import {
	createChapter,
	createWriting,
	deleteChapter,
	deleteWriting,
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
	const directory = mkdtempSync(join(tmpdir(), "abyrd-trash-"));
	const database = await open(directory);
	try {
		run(database.client);
	} finally {
		database.client.$client.close(false);
		rmSync(directory, { recursive: true, force: true });
	}
};
const rows = (db: Db) => ({
	writings: db.select().from(writings).all(),
	chapters: db.select().from(writingChapters).all(),
	notes: db.select().from(writingNotes).all(),
});

test("project notes survive writing trash and restore keeps live edits and links", async () => {
	await withDatabase((db) => {
		const project = db
			.insert(projects)
			.values({ title: "Project", createdAt: 1, updatedAt: 1 })
			.returning()
			.get();
		const book = createWriting(db, "Book");
		const shared = createNote(db, {
			writingId: book.id,
			projectId: project.id,
			chapterId: book.firstChapterId,
			title: "Shared",
		});
		const other = createWriting(db, "Other");
		updateChapter(db, other.firstChapterId, { content: link(shared.id) });
		const item = trashWriting(db, book.id);
		expect(item).not.toBeNull();
		expect(db.select().from(writingNotes).all()[0]?.writingId).toBeNull();
		updateNote(db, shared.id, {
			title: "Edited while detached",
			content: "new content",
		});
		expect(db.select().from(noteLinks).all()).toHaveLength(1);
		if (!item) throw new Error("Missing trash item");
		restoreTrashItem(db, item.id);
		const restored = db.select().from(writingNotes).all()[0];
		expect(restored?.id).toBe(shared.id);
		expect(restored?.writingId).toBe(book.id);
		expect(restored?.title).toBe("Edited while detached");
		expect(restored?.content).toBe("new content");
		expect(db.select().from(noteLinks).all()).toHaveLength(1);
	});
});

test("standalone project notes can be trashed and restored", async () => {
	await withDatabase((db) => {
		const project = db
			.insert(projects)
			.values({ title: "Project", createdAt: 1, updatedAt: 1 })
			.returning()
			.get();
		const note = createNote(db, {
			writingId: null,
			projectId: project.id,
			title: "Independent",
		});
		const item = trashNote(db, note.id);
		expect(item).not.toBeNull();
		expect(db.select().from(writingNotes).all()).toHaveLength(0);
		if (!item) throw new Error("Missing trash item");
		restoreTrashItem(db, item.id);
		expect(db.select().from(writingNotes).all()[0]?.id).toBe(note.id);
	});
});

for (const kind of ["note", "chapter", "writing"] as const) {
	test(`${kind} trash preserves mixed project descendants and restores their hierarchy`, async () => {
		await withDatabase((db) => {
			const project = db
				.insert(projects)
				.values({ title: "Project", createdAt: 1, updatedAt: 1 })
				.returning()
				.get();
			const book = createWriting(db, "Book");
			createChapter(db, book.id);
			const root = createNote(db, {
				writingId: book.id,
				projectId: project.id,
				chapterId: book.firstChapterId,
				title: "Root",
			});
			const child = createNote(db, {
				writingId: null,
				projectId: project.id,
				parentId: root.id,
				title: "Project-only child",
			});
			const grandchild = createNote(db, {
				writingId: null,
				projectId: project.id,
				parentId: child.id,
				title: "Grandchild",
			});
			const item =
				kind === "note"
					? trashNote(db, root.id)
					: kind === "chapter"
						? trashChapter(db, book.firstChapterId)
						: trashWriting(db, book.id);
			if (!item) throw new Error("Missing trash item");
			expect(loadNote(db, child.id)?.parentId).toBe(
				kind === "note" ? null : root.id,
			);
			expect(loadNote(db, grandchild.id)?.parentId).toBe(child.id);
			updateNote(db, child.id, { content: "Live edits" });
			restoreTrashItem(db, item.id);
			expect(loadNote(db, child.id)).toMatchObject({
				writingId: null,
				chapterId: null,
				parentId: root.id,
				content: "Live edits",
			});
			expect(loadNote(db, grandchild.id)?.parentId).toBe(child.id);
		});
	});
}

test("project-only children keep their placement during conflict recovery and binder moves", async () => {
	await withDatabase((db) => {
		const project = db
			.insert(projects)
			.values({ title: "Project", createdAt: 1, updatedAt: 1 })
			.returning()
			.get();
		const book = createWriting(db, "Book");
		const chapter = createChapter(db, book.id);
		const root = createNote(db, {
			writingId: book.id,
			projectId: project.id,
			chapterId: book.firstChapterId,
			title: "Root",
		});
		const child = createNote(db, {
			writingId: null,
			projectId: project.id,
			parentId: root.id,
			title: "Child",
		});
		const kept = keepUnsavedEdits(db, child, "Recovered text");
		expect(loadNote(db, kept)).toMatchObject({
			writingId: null,
			chapterId: null,
			parentId: root.id,
			content: "Recovered text",
		});
		moveNote(db, root.id, { chapterId: chapter.id, parentId: null });
		expect(loadNote(db, child.id)).toMatchObject({
			writingId: null,
			chapterId: null,
			parentId: root.id,
		});
		const item = trashNote(db, child.id);
		if (!item) throw new Error("Missing trash item");
		restoreTrashItem(db, item.id);
		expect(loadNote(db, child.id)).toMatchObject({
			writingId: null,
			chapterId: null,
			parentId: root.id,
		});
	});
});

test("hard chapter and note deletion detach shared descendants", async () => {
	await withDatabase((db) => {
		const project = db
			.insert(projects)
			.values({ title: "Project", createdAt: 1, updatedAt: 1 })
			.returning()
			.get();
		const book = createWriting(db, "Book");
		createChapter(db, book.id);
		const parent = createNote(db, {
			writingId: book.id,
			chapterId: book.firstChapterId,
			title: "Local parent",
		});
		const shared = createNote(db, {
			writingId: book.id,
			projectId: project.id,
			parentId: parent.id,
			title: "Shared child",
		});
		deleteNote(db, parent.id);
		expect(db.select().from(writingNotes).all()[0]).toMatchObject({
			id: shared.id,
			writingId: null,
			parentId: null,
			chapterId: null,
		});
		const chapterNote = createNote(db, {
			writingId: book.id,
			projectId: project.id,
			chapterId: book.firstChapterId,
			title: "Chapter note",
		});
		deleteChapter(db, book.firstChapterId);
		expect(
			db
				.select()
				.from(writingNotes)
				.all()
				.find((note) => note.id === chapterNote.id),
		).toMatchObject({ writingId: null, chapterId: null });
	});
});
const link = (id: number) =>
	JSON.stringify({
		root: {
			children: [
				{
					type: "paragraph",
					children: [{ type: "wiki-link", noteId: id, title: "x", version: 1 }],
				},
			],
		},
	});

test("writing trash round-trips original rows and rebuilds chapter and note links", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		createChapter(db, book.id, 1);
		const note = createNote(db, { writingId: book.id, title: "Target" }, 1);
		const child = createNote(
			db,
			{ writingId: book.id, parentId: note.id, title: "Child" },
			1,
		);
		updateChapter(db, book.firstChapterId, { content: link(note.id) }, 1);
		updateNote(db, child.id, { content: link(note.id) }, 1);
		const before = rows(db);
		const item = trashWriting(db, book.id, 2);
		expect(item).toMatchObject({ noteCount: 2, chapterCount: 2 });
		expect(rows(db)).toEqual({ writings: [], chapters: [], notes: [] });
		expect(restoreTrashItem(db, item?.id ?? 0, 1)).toEqual({
			kind: "writing",
			id: book.id,
			writingId: book.id,
		});
		expect(rows(db)).toEqual(before);
		expect(db.select().from(noteLinks).all()).toHaveLength(2);
		expect(listTrash(db, 3)).toEqual([]);
	}));

test("chapter restore preserves rows and shifts later chapters", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const second = createChapter(db, book.id, 1);
		const third = createChapter(db, book.id, 1);
		createNote(
			db,
			{ writingId: book.id, chapterId: second.id, title: "Scene" },
			1,
		);
		updateChapter(db, second.id, { content: "saved" }, 1);
		const before = rows(db);
		const item = trashChapter(db, second.id, 2);
		expect(
			db
				.select()
				.from(writingChapters)
				.all()
				.find((row) => row.id === third.id)?.position,
		).toBe(1);
		restoreTrashItem(db, item?.id ?? 0, 1);
		expect(rows(db)).toEqual(before);
	}));

test("last chapter refusal and missing items make no changes", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		try {
			trashChapter(db, book.firstChapterId, 2);
			throw new Error("Should refuse");
		} catch (error) {
			expect(error).toBeInstanceOf(TrashError);
			expect(error).toMatchObject({ reason: "last-chapter" });
		}
		expect(listTrash(db, 2)).toEqual([]);
		expect(trashChapter(db, 999, 2)).toBeNull();
		expect(trashNote(db, 999, 2)).toBeNull();
		expect(trashWriting(db, 999, 2)).toBeNull();
	}));

test("note subtree round-trips content and inner positions, appending its root", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const root = createNote(db, { writingId: book.id, title: "Root" }, 1);
		const child = createNote(
			db,
			{ writingId: book.id, parentId: root.id, title: "Child" },
			1,
		);
		updateNote(db, child.id, { content: "saved" }, 1);
		const before = rows(db);
		const item = trashNote(db, root.id, 2);
		restoreTrashItem(db, item?.id ?? 0, 1);
		expect(rows(db)).toEqual(before);
		const again = trashNote(db, root.id, 2);
		createNote(db, { writingId: book.id, title: "New sibling" }, 2);
		restoreTrashItem(db, again?.id ?? 0, 3);
		expect(rows(db).notes.find((note) => note.id === root.id)?.position).toBe(
			1,
		);
	}));

test("note restore falls back to book level when chapter and parent disappeared", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const chapter = createChapter(db, book.id, 1);
		const parent = createNote(
			db,
			{ writingId: book.id, chapterId: chapter.id, title: "Parent" },
			1,
		);
		const root = createNote(
			db,
			{ writingId: book.id, parentId: parent.id, title: "Root" },
			1,
		);
		const child = createNote(
			db,
			{ writingId: book.id, parentId: root.id, title: "Child" },
			1,
		);
		const item = trashNote(db, root.id, 2);
		deleteNote(db, parent.id, 3);
		deleteChapter(db, chapter.id, 3);
		restoreTrashItem(db, item?.id ?? 0, 4);
		expect(rows(db).notes).toEqual([
			{ ...root, chapterId: null, parentId: null },
			{ ...child, chapterId: null },
		]);
	}));

test("writing-gone and id-conflict preserve trash and roll back restore", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const chapter = createChapter(db, book.id, 1);
		const item = trashChapter(db, chapter.id, 2);
		db.insert(writingChapters).values(chapter).run();
		expect(() => restoreTrashItem(db, item?.id ?? 0, 3)).toThrow("id-conflict");
		deleteWriting(db, book.id);
		expect(() => restoreTrashItem(db, item?.id ?? 0, 4)).toThrow(
			"writing-gone",
		);
		expect(listTrash(db, 4)).toHaveLength(1);
	}));

test("trash expires only after 30 days and can be deleted forever", () =>
	withDatabase((db) => {
		const book = createWriting(db, "Book", 1);
		const item = trashWriting(db, book.id, 100);
		const deadline = 100 + 30 * 86_400_000;
		expect(purgeExpiredTrash(db, deadline)).toBe(0);
		expect(listTrash(db, deadline + 1)).toEqual([]);
		expect(restoreTrashItem(db, item?.id ?? 0, deadline + 1)).toBeNull();
		const next = createWriting(db, "Next", 1);
		const second = trashWriting(db, next.id, 100);
		expect(deleteTrashItem(db, second?.id ?? 0)).toBe(true);
		expect(deleteTrashItem(db, second?.id ?? 0)).toBe(false);
	}));
