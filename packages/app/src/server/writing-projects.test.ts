import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { createDatabase } from "./database/service";
import { createNote, loadNote } from "./writing-notes";
import {
	createProject,
	createProjectNote,
	deleteProject,
	getProject,
	setWritingProject,
	shareProjectNote,
} from "./writing-projects";
import { createWriting, loadWriting } from "./writings";

test("deleting a project keeps writings and their shared notes, and removes wiki-only notes", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-projects-"));
	const { client: db } = await Effect.runPromise(
		createDatabase({
			databasePath: join(directory, "app.sqlite"),
			migrationsFolder: join(process.cwd(), "drizzle"),
		}),
	);
	try {
		const project = createProject(db, "Pandom");
		const book = createWriting(db, "The Ferry");
		setWritingProject(db, book.id, project.id);
		const shared = createNote(db, { writingId: book.id, title: "Harbor" });
		shareProjectNote(db, shared.id);
		const wiki = createProjectNote(db, project.id, "Calendar");
		const child = createProjectNote(db, project.id, "Festivals", wiki.id);
		// A wiki-only note nested under a shared book note.
		const underShared = createProjectNote(db, project.id, "Tides", shared.id);

		expect(deleteProject(db, project.id)).toEqual({
			keptNotes: 1,
			deletedNotes: 3,
		});
		expect(getProject(db, project.id)).toBeNull();
		expect(loadWriting(db, book.id)?.projectId).toBeNull();
		expect(loadNote(db, shared.id)).toMatchObject({
			writingId: book.id,
			projectId: null,
		});
		for (const note of [wiki, child, underShared])
			expect(loadNote(db, note.id)).toBeNull();
		expect(deleteProject(db, project.id)).toBeNull();
	} finally {
		db.$client.close(false);
		rmSync(directory, { recursive: true, force: true });
	}
});
