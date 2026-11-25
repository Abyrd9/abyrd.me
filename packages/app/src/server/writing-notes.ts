import {
	and,
	asc,
	desc,
	eq,
	gt,
	isNull,
	like,
	lt,
	max,
	sql,
} from "drizzle-orm";
import { writingChapters, writingNotes, writings } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";
import { loadBacklinks, replaceNoteLinks } from "./note-links";
import { contentRevision, type Transaction, touchWriting } from "./writings";

/** Where a note sits: in a writing, optionally in one of its chapters, and under a parent. */
export type NotePlacement = {
	writingId: number;
	chapterId: number | null;
	parentId: number | null;
};

export class NotePlacementError extends Error {}

/** Every note in a writing, without content, for drawing the binder. */
export function listNotes(db: AppDatabaseClient, writingId: number) {
	return db
		.select({
			id: writingNotes.id,
			chapterId: writingNotes.chapterId,
			parentId: writingNotes.parentId,
			title: writingNotes.title,
			position: writingNotes.position,
			updatedAt: writingNotes.updatedAt,
		})
		.from(writingNotes)
		.where(eq(writingNotes.writingId, writingId))
		.orderBy(asc(writingNotes.position), asc(writingNotes.id))
		.all();
}

/** A note with its content, its place in the tree, and what links to it. */
export function loadNote(db: AppDatabaseClient, id: number) {
	const note = db
		.select()
		.from(writingNotes)
		.where(eq(writingNotes.id, id))
		.get();
	if (!note) return null;

	const writing = db
		.select({ id: writings.id, title: writings.title })
		.from(writings)
		.where(eq(writings.id, note.writingId))
		.get();
	const chapter = note.chapterId
		? (db
				.select({
					id: writingChapters.id,
					title: writingChapters.title,
					position: writingChapters.position,
				})
				.from(writingChapters)
				.where(eq(writingChapters.id, note.chapterId))
				.get() ?? null)
		: null;
	// Walks up from the parent to the top of the tree, then lists outermost first.
	const ancestors = db.all<{ id: number; title: string }>(sql`
		WITH RECURSIVE up(id, parent_id, title, depth) AS (
			SELECT id, parent_id, title, 0 FROM writing_notes WHERE id = ${note.parentId}
			UNION ALL
			SELECT n.id, n.parent_id, n.title, up.depth + 1
			FROM writing_notes n JOIN up ON n.id = up.parent_id
		)
		SELECT id, title FROM up ORDER BY depth DESC
	`);

	return {
		...note,
		revision: contentRevision(note.content),
		writing: writing ?? { id: note.writingId, title: "" },
		chapter,
		ancestors,
		backlinks: loadBacklinks(db, id),
	};
}

export function createNote(
	db: AppDatabaseClient,
	input: Partial<NotePlacement> & { writingId: number; title: string },
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const place = resolvePlacement(tx, {
			writingId: input.writingId,
			chapterId: input.chapterId ?? null,
			parentId: input.parentId ?? null,
		});
		const note = tx
			.insert(writingNotes)
			.values({
				...place,
				title: input.title,
				position: nextPosition(tx, place),
				createdAt: now,
				updatedAt: now,
			})
			.returning()
			.get();
		touchWriting(tx, place.writingId, now);
		return note;
	});
}

/**
 * Saves a note's title or text. With baseRevision, text is saved only if the
 * note still holds the version the editor started from; otherwise nothing
 * changes and the current version comes back as a conflict.
 */
export function updateNote(
	db: AppDatabaseClient,
	id: number,
	{
		baseRevision,
		...changes
	}: { title?: string; content?: string; baseRevision?: string },
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const current = tx
			.select()
			.from(writingNotes)
			.where(eq(writingNotes.id, id))
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
				chapterId: current.chapterId,
				parentId: current.parentId,
				title: current.title,
				content: current.content,
				revision: contentRevision(current.content),
			};
		tx.update(writingNotes)
			.set({ ...changes, updatedAt: now })
			.where(eq(writingNotes.id, id))
			.run();
		if (changes.content !== undefined)
			replaceNoteLinks(tx, { noteId: id }, changes.content);
		touchWriting(tx, current.writingId, now);
		return {
			conflict: false as const,
			id,
			writingId: current.writingId,
			revision: contentRevision(changes.content ?? current.content),
		};
	});
}

/**
 * Keeps text that couldn't be saved because its chapter or note changed
 * elsewhere, as a new note beside it, so nothing typed is lost.
 */
export function keepUnsavedEdits(
	db: AppDatabaseClient,
	from: {
		writingId: number;
		chapterId: number | null;
		parentId: number | null;
		title: string;
	},
	content: string,
) {
	const note = createNote(db, {
		writingId: from.writingId,
		chapterId: from.chapterId,
		parentId: from.parentId,
		title: `${from.title || "Untitled"}: your unsaved edits`,
	});
	updateNote(db, note.id, { content });
	return note.id;
}

/**
 * Moves a note, with everything beneath it, to another place in the same
 * writing. It lands last among its new siblings.
 */
export function moveNote(
	db: AppDatabaseClient,
	id: number,
	to: { chapterId: number | null; parentId: number | null },
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const note = tx
			.select()
			.from(writingNotes)
			.where(eq(writingNotes.id, id))
			.get();
		if (!note) throw new NotePlacementError("That note no longer exists.");

		const place = resolvePlacement(tx, { writingId: note.writingId, ...to });
		const subtree = descendantIds(tx, id);
		if (place.parentId !== null && subtree.includes(place.parentId))
			throw new NotePlacementError("A note can't move inside itself.");

		tx.update(writingNotes)
			.set({
				chapterId: place.chapterId,
				parentId: place.parentId,
				position: nextPosition(tx, place),
				updatedAt: now,
			})
			.where(eq(writingNotes.id, id))
			.run();
		// Children always live in their parent's chapter.
		for (const childId of subtree.filter((noteId) => noteId !== id))
			tx.update(writingNotes)
				.set({ chapterId: place.chapterId })
				.where(eq(writingNotes.id, childId))
				.run();
		touchWriting(tx, note.writingId, now);
		return true;
	});
}

/** Swaps a note with its neighbor among its siblings. Returns false at either end. */
export function reorderNote(
	db: AppDatabaseClient,
	id: number,
	direction: "earlier" | "later",
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const note = tx
			.select()
			.from(writingNotes)
			.where(eq(writingNotes.id, id))
			.get();
		if (!note) return false;

		const earlier = direction === "earlier";
		const neighbor = tx
			.select()
			.from(writingNotes)
			.where(
				and(
					siblingsOf(note),
					earlier
						? lt(writingNotes.position, note.position)
						: gt(writingNotes.position, note.position),
				),
			)
			.orderBy(
				earlier ? desc(writingNotes.position) : asc(writingNotes.position),
			)
			.get();
		if (!neighbor) return false;

		tx.update(writingNotes)
			.set({ position: neighbor.position })
			.where(eq(writingNotes.id, note.id))
			.run();
		tx.update(writingNotes)
			.set({ position: note.position })
			.where(eq(writingNotes.id, neighbor.id))
			.run();
		touchWriting(tx, note.writingId, now);
		return true;
	});
}

/** Deletes a note and every note beneath it. Links to them are dropped too. */
export function deleteNote(
	db: AppDatabaseClient,
	id: number,
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const note = tx
			.delete(writingNotes)
			.where(eq(writingNotes.id, id))
			.returning({ writingId: writingNotes.writingId })
			.get();
		if (note) touchWriting(tx, note.writingId, now);
		return note !== undefined;
	});
}

/**
 * Notes in any writing whose title contains the query, for the link picker.
 * Notes from the current writing come first.
 */
export function searchNotes(
	db: AppDatabaseClient,
	query: string,
	currentWritingId: number,
	limit = 20,
) {
	const escaped = query
		.trim()
		.replace(/[\\%_]/g, (character) => `\\${character}`);
	return db
		.select({
			id: writingNotes.id,
			title: writingNotes.title,
			writingId: writings.id,
			writingTitle: writings.title,
			chapterId: writingNotes.chapterId,
			chapterTitle: writingChapters.title,
			chapterPosition: writingChapters.position,
		})
		.from(writingNotes)
		.innerJoin(writings, eq(writingNotes.writingId, writings.id))
		.leftJoin(writingChapters, eq(writingNotes.chapterId, writingChapters.id))
		.where(like(writingNotes.title, sql`${`%${escaped}%`} ESCAPE '\\'`))
		.orderBy(
			desc(sql`${writingNotes.writingId} = ${currentWritingId}`),
			desc(writingNotes.updatedAt),
		)
		.limit(limit)
		.all();
}

/**
 * Checks that a placement exists. Under a parent, the note takes the parent's
 * chapter; otherwise the chapter must belong to the writing.
 */
function resolvePlacement(
	tx: Transaction,
	place: NotePlacement,
): NotePlacement {
	if (place.parentId !== null) {
		const parent = tx
			.select({
				writingId: writingNotes.writingId,
				chapterId: writingNotes.chapterId,
			})
			.from(writingNotes)
			.where(eq(writingNotes.id, place.parentId))
			.get();
		if (!parent || parent.writingId !== place.writingId)
			throw new NotePlacementError(
				"That parent note isn't part of this writing.",
			);
		return { ...place, chapterId: parent.chapterId };
	}
	if (place.chapterId !== null) {
		const chapter = tx
			.select({ writingId: writingChapters.writingId })
			.from(writingChapters)
			.where(eq(writingChapters.id, place.chapterId))
			.get();
		if (!chapter || chapter.writingId !== place.writingId)
			throw new NotePlacementError("That chapter isn't part of this writing.");
		return place;
	}
	const writing = tx
		.select({ id: writings.id })
		.from(writings)
		.where(eq(writings.id, place.writingId))
		.get();
	if (!writing) throw new NotePlacementError("That writing no longer exists.");
	return place;
}

const siblingsOf = (place: NotePlacement) =>
	and(
		eq(writingNotes.writingId, place.writingId),
		place.chapterId === null
			? isNull(writingNotes.chapterId)
			: eq(writingNotes.chapterId, place.chapterId),
		place.parentId === null
			? isNull(writingNotes.parentId)
			: eq(writingNotes.parentId, place.parentId),
	);

const nextPosition = (tx: Transaction, place: NotePlacement) => {
	const last = tx
		.select({ position: max(writingNotes.position) })
		.from(writingNotes)
		.where(siblingsOf(place))
		.get();
	return (last?.position ?? -1) + 1;
};

/** The note and every note beneath it, at any depth. */
const descendantIds = (tx: Transaction, id: number) =>
	tx
		.all<{ id: number }>(sql`
			WITH RECURSIVE down(id) AS (
				SELECT ${id}
				UNION ALL
				SELECT n.id FROM writing_notes n JOIN down ON n.parent_id = down.id
			)
			SELECT id FROM down
		`)
		.map((row) => row.id);
