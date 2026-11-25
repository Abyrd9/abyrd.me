import { asc, desc, eq, sql } from "drizzle-orm";
import { projects, writingNotes, writings } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";
import { rootBlocks, textOf } from "./lexical-json";
import { NotePlacementError } from "./writing-notes";

export function listProjects(db: AppDatabaseClient) {
	return db
		.select()
		.from(projects)
		.orderBy(asc(projects.title), asc(projects.id))
		.all();
}

export function createProject(db: AppDatabaseClient, title: string) {
	const now = Date.now();
	return db
		.insert(projects)
		.values({ title, createdAt: now, updatedAt: now })
		.returning()
		.get();
}

export function renameProject(
	db: AppDatabaseClient,
	id: number,
	title: string,
) {
	return db
		.update(projects)
		.set({ title, updatedAt: Date.now() })
		.where(eq(projects.id, id))
		.returning()
		.get();
}

export function getProject(db: AppDatabaseClient, id: number) {
	const project = db.select().from(projects).where(eq(projects.id, id)).get();
	if (!project) return null;
	return {
		...project,
		writings: db
			.select({ id: writings.id, title: writings.title })
			.from(writings)
			.where(eq(writings.projectId, id))
			.orderBy(asc(writings.title))
			.all(),
	};
}

export function setWritingProject(
	db: AppDatabaseClient,
	writingId: number,
	projectId: number | null,
) {
	return db
		.update(writings)
		.set({ projectId, updatedAt: Date.now() })
		.where(eq(writings.id, writingId))
		.returning({ id: writings.id, projectId: writings.projectId })
		.get();
}

export function listProjectNotes(
	db: AppDatabaseClient,
	projectId: number,
	query?: string,
) {
	const term = query?.trim().toLowerCase();
	const notes = db
		.select({
			id: writingNotes.id,
			title: writingNotes.title,
			parentId: writingNotes.parentId,
			writingId: writingNotes.writingId,
			chapterId: writingNotes.chapterId,
			content: term ? writingNotes.content : sql<null>`NULL`,
		})
		.from(writingNotes)
		.where(eq(writingNotes.projectId, projectId))
		.orderBy(asc(writingNotes.position), asc(writingNotes.id))
		.all();
	const visible = new Set(notes.map((note) => note.id));
	return notes.flatMap(({ content, parentId, ...note }) => {
		if (
			term &&
			!note.title.toLowerCase().includes(term) &&
			!rootBlocks(content).some((block) =>
				textOf(block).toLowerCase().includes(term),
			)
		)
			return [];
		return [
			{
				...note,
				parentId: parentId !== null && visible.has(parentId) ? parentId : null,
			},
		];
	});
}

export function createProjectNote(
	db: AppDatabaseClient,
	projectId: number,
	title: string,
	parentId?: number | null,
) {
	return db.transaction((tx) => {
		if (
			parentId != null &&
			tx
				.select({ projectId: writingNotes.projectId })
				.from(writingNotes)
				.where(eq(writingNotes.id, parentId))
				.get()?.projectId !== projectId
		)
			throw new NotePlacementError("Choose a parent note in this project.");
		const last = tx
			.select({ position: writingNotes.position })
			.from(writingNotes)
			.where(eq(writingNotes.projectId, projectId))
			.orderBy(desc(writingNotes.position))
			.limit(1)
			.get();
		const now = Date.now();
		return tx
			.insert(writingNotes)
			.values({
				projectId,
				parentId,
				title,
				position: (last?.position ?? -1) + 1,
				createdAt: now,
				updatedAt: now,
			})
			.returning()
			.get();
	});
}

export function shareProjectNote(
	db: AppDatabaseClient,
	noteId: number,
	includeSubnotes = false,
) {
	return db.transaction((tx) => {
		const origin = tx
			.select({ writingId: writings.id, projectId: writings.projectId })
			.from(writingNotes)
			.innerJoin(writings, eq(writingNotes.writingId, writings.id))
			.where(eq(writingNotes.id, noteId))
			.get();
		if (!origin?.projectId)
			throw new NotePlacementError(
				"Attach the book to a project before sharing its notes.",
			);
		// Only follow children attached to this book. Wiki-only children may
		// also sit under a shared parent, but already have a project home.
		const selected = includeSubnotes
			? tx.all<{ id: number }>(sql`
			WITH RECURSIVE tree(id) AS (
				SELECT ${noteId} UNION SELECT n.id FROM writing_notes n
				JOIN tree ON n.parent_id = tree.id WHERE n.writing_id = ${origin.writingId}
			) SELECT id FROM tree`)
			: [{ id: noteId }];
		for (const { id } of selected) {
			const note = tx
				.select({ projectId: writingNotes.projectId })
				.from(writingNotes)
				.where(eq(writingNotes.id, id))
				.get();
			if (note?.projectId && note.projectId !== origin.projectId)
				throw new NotePlacementError(
					"This note already belongs to another project's wiki.",
				);
			tx.update(writingNotes)
				.set({ projectId: origin.projectId })
				.where(eq(writingNotes.id, id))
				.run();
		}
		return { noteId, projectId: origin.projectId, count: selected.length };
	});
}
