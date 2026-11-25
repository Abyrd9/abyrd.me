import { createHash } from "node:crypto";
import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	lt,
	max,
	type SQL,
	sql,
	sum,
} from "drizzle-orm";
import type { PageSizeId } from "#/writing-page-sizes";
import {
	writingChapters,
	writingNotes,
	writingSuggestions,
	writings,
} from "./database/schema";
import type { AppDatabaseClient } from "./database/service";
import { rootBlocks, textOf, typeOf } from "./lexical-json";
import { replaceNoteLinks } from "./note-links";

const PREVIEW_CHARACTERS = 600;

/**
 * A fingerprint of saved text. Editors send back the one they started from,
 * so a save can't silently overwrite text changed elsewhere, like by an agent.
 */
export const contentRevision = (content: string | null) =>
	createHash("sha256")
		.update(content ?? "")
		.digest("base64url")
		.slice(0, 22);

export type PreviewBlock = { kind: "heading" | "paragraph"; text: string };

/** The opening blocks of a saved chapter, as plain text for the library thumbnail. */
export function previewBlocks(content: string | null) {
	const blocks: PreviewBlock[] = [];
	let remaining = PREVIEW_CHARACTERS;
	for (const node of rootBlocks(content)) {
		if (remaining <= 0) break;
		const text = textOf(node).trim();
		if (!text) continue;
		blocks.push({
			kind: typeOf(node) === "heading" ? "heading" : "paragraph",
			text: text.slice(0, remaining),
		});
		remaining -= text.length;
	}
	return blocks;
}

export function listWritings(db: AppDatabaseClient) {
	const openings = new Map(
		db
			.select({
				writingId: writingChapters.writingId,
				content: writingChapters.content,
			})
			.from(writingChapters)
			.where(eq(writingChapters.position, 0))
			.all()
			.map((chapter) => [chapter.writingId, chapter.content]),
	);

	return db
		.select({
			id: writings.id,
			projectId: writings.projectId,
			title: writings.title,
			pageSize: writings.pageSize,
			createdAt: writings.createdAt,
			updatedAt: writings.updatedAt,
			chapterCount: count(writingChapters.id),
			wordCount:
				sql<number>`coalesce(${sum(writingChapters.wordCount)}, 0)`.mapWith(
					Number,
				),
		})
		.from(writings)
		.leftJoin(writingChapters, eq(writingChapters.writingId, writings.id))
		.groupBy(writings.id)
		.orderBy(desc(writings.updatedAt), desc(writings.id))
		.all()
		.map((writing) => ({
			...writing,
			preview: previewBlocks(openings.get(writing.id) ?? null),
		}));
}

/** Every writing starts with one chapter so the editor always has a page to show. */
export function createWriting(
	db: AppDatabaseClient,
	title: string,
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const writing = tx
			.insert(writings)
			.values({ title, createdAt: now, updatedAt: now })
			.returning()
			.get();
		const chapter = tx
			.insert(writingChapters)
			.values({
				writingId: writing.id,
				position: 0,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: writingChapters.id })
			.get();
		return { ...writing, firstChapterId: chapter.id };
	});
}

export function loadWriting(db: AppDatabaseClient, id: number) {
	const writing = db.select().from(writings).where(eq(writings.id, id)).get();
	if (!writing) return null;

	const chapters = db
		.select()
		.from(writingChapters)
		.where(eq(writingChapters.writingId, id))
		.orderBy(asc(writingChapters.position), asc(writingChapters.id))
		.all()
		.map((chapter) => ({
			...chapter,
			revision: contentRevision(chapter.content),
		}));
	return { ...writing, chapters };
}

/**
 * Each chapter's and note's current text fingerprint and place, so an open
 * editor can notice changes made elsewhere without reloading everything.
 */
export function loadRevisions(db: AppDatabaseClient, writingId: number) {
	const chapters = db
		.select({
			id: writingChapters.id,
			title: writingChapters.title,
			position: writingChapters.position,
			content: writingChapters.content,
		})
		.from(writingChapters)
		.where(eq(writingChapters.writingId, writingId))
		.orderBy(asc(writingChapters.position))
		.all()
		.map(({ content, ...chapter }) => ({
			...chapter,
			revision: contentRevision(content),
		}));
	const notes = db
		.select({
			id: writingNotes.id,
			title: writingNotes.title,
			chapterId: writingNotes.chapterId,
			parentId: writingNotes.parentId,
			position: writingNotes.position,
			content: writingNotes.content,
		})
		.from(writingNotes)
		.where(eq(writingNotes.writingId, writingId))
		.orderBy(asc(writingNotes.position), asc(writingNotes.id))
		.all()
		.map(({ content, ...note }) => ({
			...note,
			revision: contentRevision(content),
		}));
	const suggestions = db
		.select({
			id: writingSuggestions.id,
			chapterId: writingSuggestions.chapterId,
		})
		.from(writingSuggestions)
		.innerJoin(
			writingChapters,
			eq(writingSuggestions.chapterId, writingChapters.id),
		)
		.where(
			and(
				eq(writingChapters.writingId, writingId),
				eq(writingSuggestions.status, "pending"),
			),
		)
		.orderBy(asc(writingSuggestions.id))
		.all();
	return { chapters, notes, suggestions };
}

/** One chapter with its text, for reloading it after a change elsewhere. */
export function loadChapter(db: AppDatabaseClient, id: number) {
	const chapter = db
		.select()
		.from(writingChapters)
		.where(eq(writingChapters.id, id))
		.get();
	return chapter
		? { ...chapter, revision: contentRevision(chapter.content) }
		: null;
}

export function updateWriting(
	db: AppDatabaseClient,
	id: number,
	changes: { title?: string; pageSize?: PageSizeId },
	now = Date.now(),
) {
	return db
		.update(writings)
		.set({ ...changes, updatedAt: now })
		.where(eq(writings.id, id))
		.returning()
		.get();
}

export function deleteWriting(db: AppDatabaseClient, id: number) {
	db.transaction((tx) => {
		preserveProjectNotes(tx, eq(writingNotes.writingId, id));
		tx.delete(writings).where(eq(writings.id, id)).run();
	});
}

/** Project notes outlive their binder placement, including a deleted ancestor. */
export function affectedNoteIds(tx: Transaction, scope: SQL) {
	return tx
		.all<{ id: number }>(sql`
		WITH RECURSIVE affected(id) AS (
			SELECT id FROM writing_notes WHERE ${scope}
			UNION
			SELECT n.id FROM writing_notes n JOIN affected ON n.parent_id = affected.id
		) SELECT id FROM affected
	`)
		.map((note) => note.id);
}

export function preserveProjectNotes(
	tx: Transaction,
	scope: SQL,
	excludedId?: number,
) {
	const ids = affectedNoteIds(tx, scope);
	if (!ids.length) return;
	const affected = new Set(ids);
	const notes = tx
		.select({
			id: writingNotes.id,
			parentId: writingNotes.parentId,
			projectId: writingNotes.projectId,
		})
		.from(writingNotes)
		.where(inArray(writingNotes.id, ids))
		.all();
	const survivors = new Set(
		notes
			.filter((note) => note.projectId !== null && note.id !== excludedId)
			.map((note) => note.id),
	);
	for (const note of notes) {
		if (!survivors.has(note.id)) continue;
		tx.update(writingNotes)
			.set({
				writingId: null,
				chapterId: null,
				parentId:
					note.parentId !== null &&
					(survivors.has(note.parentId) || !affected.has(note.parentId))
						? note.parentId
						: null,
			})
			.where(eq(writingNotes.id, note.id))
			.run();
	}
}

export function createChapter(
	db: AppDatabaseClient,
	writingId: number,
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const last = tx
			.select({ position: max(writingChapters.position) })
			.from(writingChapters)
			.where(eq(writingChapters.writingId, writingId))
			.get();
		const chapter = tx
			.insert(writingChapters)
			.values({
				writingId,
				position: (last?.position ?? -1) + 1,
				createdAt: now,
				updatedAt: now,
			})
			.returning()
			.get();
		touchWriting(tx, writingId, now);
		return { ...chapter, revision: contentRevision(chapter.content) };
	});
}

/**
 * Saves a chapter's title or text. With baseRevision, text is saved only if
 * the chapter still holds the version the editor started from; otherwise
 * nothing changes and the current version comes back as a conflict.
 */
export function updateChapter(
	db: AppDatabaseClient,
	id: number,
	{
		baseRevision,
		...changes
	}: {
		title?: string;
		content?: string;
		wordCount?: number;
		baseRevision?: string;
	},
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const current = tx
			.select()
			.from(writingChapters)
			.where(eq(writingChapters.id, id))
			.get();
		if (!current) return null;
		if (
			changes.content !== undefined &&
			baseRevision !== undefined &&
			baseRevision !== contentRevision(current.content)
		)
			return {
				conflict: true as const,
				id,
				writingId: current.writingId,
				title: current.title,
				position: current.position,
				content: current.content,
				revision: contentRevision(current.content),
			};
		tx.update(writingChapters)
			.set({ ...changes, updatedAt: now })
			.where(eq(writingChapters.id, id))
			.run();
		if (changes.content !== undefined)
			replaceNoteLinks(tx, { chapterId: id }, changes.content);
		touchWriting(tx, current.writingId, now);
		return {
			conflict: false as const,
			id,
			writingId: current.writingId,
			revision: contentRevision(changes.content ?? current.content),
		};
	});
}

/** Deletes a chapter, with its notes, unless it is the writing's last one. */
export function deleteChapter(
	db: AppDatabaseClient,
	id: number,
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const chapter = tx
			.select()
			.from(writingChapters)
			.where(eq(writingChapters.id, id))
			.get();
		if (!chapter) return false;

		const siblings = tx
			.select({ id: writingChapters.id })
			.from(writingChapters)
			.where(eq(writingChapters.writingId, chapter.writingId))
			.all();
		if (siblings.length <= 1) return false;

		preserveProjectNotes(tx, eq(writingNotes.chapterId, id));
		tx.delete(writingChapters).where(eq(writingChapters.id, id)).run();
		tx.update(writingChapters)
			.set({ position: sql`${writingChapters.position} - 1` })
			.where(
				and(
					eq(writingChapters.writingId, chapter.writingId),
					gt(writingChapters.position, chapter.position),
				),
			)
			.run();
		touchWriting(tx, chapter.writingId, now);
		return true;
	});
}

/** Swaps a chapter with its neighbor. Returns false at either end. */
export function moveChapter(
	db: AppDatabaseClient,
	id: number,
	direction: "earlier" | "later",
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const chapter = tx
			.select()
			.from(writingChapters)
			.where(eq(writingChapters.id, id))
			.get();
		if (!chapter) return false;

		const earlier = direction === "earlier";
		const neighbor = tx
			.select()
			.from(writingChapters)
			.where(
				and(
					eq(writingChapters.writingId, chapter.writingId),
					earlier
						? lt(writingChapters.position, chapter.position)
						: gt(writingChapters.position, chapter.position),
				),
			)
			.orderBy(
				earlier
					? desc(writingChapters.position)
					: asc(writingChapters.position),
			)
			.get();
		if (!neighbor) return false;

		tx.update(writingChapters)
			.set({ position: neighbor.position })
			.where(eq(writingChapters.id, chapter.id))
			.run();
		tx.update(writingChapters)
			.set({ position: chapter.position })
			.where(eq(writingChapters.id, neighbor.id))
			.run();
		touchWriting(tx, chapter.writingId, now);
		return true;
	});
}

export type Transaction = Parameters<
	Parameters<AppDatabaseClient["transaction"]>[0]
>[0];

export function touchWriting(
	tx: Transaction,
	writingId: number | null,
	now: number,
) {
	if (writingId === null) return;
	tx.update(writings)
		.set({ updatedAt: now })
		.where(eq(writings.id, writingId))
		.run();
}
