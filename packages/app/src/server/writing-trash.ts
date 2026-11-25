import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import {
	writingChapters,
	writingNotes,
	writings,
	writingTrash,
} from "./database/schema";
import type { AppDatabaseClient } from "./database/service";
import { replaceNoteLinks } from "./note-links";
import {
	affectedNoteIds,
	preserveProjectNotes,
	touchWriting,
} from "./writings";

const retention = 30 * 24 * 60 * 60 * 1000;
type Kind = "writing" | "chapter" | "note";
type Snapshot = {
	writing: typeof writings.$inferSelect | null;
	chapters: (typeof writingChapters.$inferSelect)[];
	notes: (typeof writingNotes.$inferSelect)[];
	rootId: number;
	preservedNoteIds?: number[];
};
type TrashRow = typeof writingTrash.$inferSelect;
export type TrashItem = Omit<TrashRow, "snapshot"> & {
	noteCount: number;
	chapterCount: number;
};

/** Failed operations leave the trash item intact. Missing items return null. */
export class TrashError extends Error {
	constructor(public reason: "last-chapter" | "writing-gone" | "id-conflict") {
		super(reason);
		this.name = "TrashError";
	}
}

// Snapshots are written and read only by this module.
const snapshotOf = (row: TrashRow): Snapshot => JSON.parse(row.snapshot);
const itemOf = ({ snapshot, ...row }: TrashRow): TrashItem => {
	const data: Snapshot = JSON.parse(snapshot);
	return {
		...row,
		chapterCount: data.chapters.length,
		noteCount: data.notes.length,
	};
};

const trash = (db: AppDatabaseClient, kind: Kind, id: number, now: number) =>
	db.transaction((tx) => {
		const chapter =
			kind === "chapter"
				? tx
						.select()
						.from(writingChapters)
						.where(eq(writingChapters.id, id))
						.get()
				: undefined;
		const note =
			kind === "note"
				? tx.select().from(writingNotes).where(eq(writingNotes.id, id)).get()
				: undefined;
		const writingId =
			kind === "writing" ? id : (chapter?.writingId ?? note?.writingId);
		if (writingId === undefined) return null;
		const writing =
			writingId === null
				? null
				: tx.select().from(writings).where(eq(writings.id, writingId)).get();
		if (!writing && writingId !== null) return null;
		const chapters = tx
			.select()
			.from(writingChapters)
			.where(
				writingId === null ? sql`0` : eq(writingChapters.writingId, writingId),
			)
			.all();
		if (kind === "chapter" && chapters.length === 1)
			throw new TrashError("last-chapter");
		const scope =
			kind === "note"
				? eq(writingNotes.id, id)
				: kind === "chapter"
					? eq(writingNotes.chapterId, id)
					: eq(writingNotes.writingId, id);
		const ids = affectedNoteIds(tx, scope);
		const notes = ids.length
			? tx
					.select()
					.from(writingNotes)
					.where(inArray(writingNotes.id, ids))
					.all()
			: [];
		const snapshot: Snapshot = {
			writing: writing ?? null,
			rootId: id,
			chapters: kind === "writing" ? chapters : chapter ? [chapter] : [],
			notes,
		};
		snapshot.preservedNoteIds = snapshot.notes
			.filter(
				(saved) =>
					saved.projectId !== null && (kind !== "note" || saved.id !== id),
			)
			.map((saved) => saved.id);
		const row = tx
			.insert(writingTrash)
			.values({
				kind,
				title: chapter?.title ?? note?.title ?? writing?.title ?? "",
				writingId,
				writingTitle: writing?.title ?? null,
				snapshot: JSON.stringify(snapshot),
				deletedAt: now,
			})
			.returning()
			.get();
		// Keep project-owned notes alive so other writings retain their links.
		preserveProjectNotes(tx, scope, kind === "note" ? id : undefined);
		if (kind === "writing")
			tx.delete(writings).where(eq(writings.id, id)).run();
		else {
			if (chapter) {
				tx.delete(writingChapters).where(eq(writingChapters.id, id)).run();
				tx.update(writingChapters)
					.set({ position: sql`${writingChapters.position} - 1` })
					.where(
						and(
							eq(writingChapters.writingId, chapter.writingId),
							sql`${writingChapters.position} > ${chapter.position}`,
						),
					)
					.run();
			} else tx.delete(writingNotes).where(eq(writingNotes.id, id)).run();
			touchWriting(tx, writingId, now);
		}
		return itemOf(row);
	});

export const trashWriting = (
	db: AppDatabaseClient,
	id: number,
	now = Date.now(),
) => trash(db, "writing", id, now);
/** Throws TrashError with reason "last-chapter" rather than deleting the final chapter. */
export const trashChapter = (
	db: AppDatabaseClient,
	id: number,
	now = Date.now(),
) => trash(db, "chapter", id, now);
export const trashNote = (
	db: AppDatabaseClient,
	id: number,
	now = Date.now(),
) => trash(db, "note", id, now);

export const purgeExpiredTrash = (db: AppDatabaseClient, now = Date.now()) =>
	db
		.delete(writingTrash)
		.where(lt(writingTrash.deletedAt, now - retention))
		.returning({ id: writingTrash.id })
		.all().length;
export const deleteTrashItem = (db: AppDatabaseClient, id: number) =>
	db.delete(writingTrash).where(eq(writingTrash.id, id)).returning().get() !==
	undefined;
export const listTrash = (db: AppDatabaseClient, now = Date.now()) => {
	purgeExpiredTrash(db, now);
	return db
		.select()
		.from(writingTrash)
		.orderBy(desc(writingTrash.deletedAt), desc(writingTrash.id))
		.all()
		.map(itemOf);
};

export const restoreTrashItem = (
	db: AppDatabaseClient,
	trashId: number,
	now = Date.now(),
) => {
	purgeExpiredTrash(db, now);
	return db.transaction((tx) => {
		const row = tx
			.select()
			.from(writingTrash)
			.where(eq(writingTrash.id, trashId))
			.get();
		if (!row) return null;
		const data = snapshotOf(row);
		const writingId = data.writing?.id ?? null;
		const existing =
			writingId === null
				? null
				: tx.select().from(writings).where(eq(writings.id, writingId)).get();
		if (row.kind !== "writing" && writingId !== null && !existing)
			throw new TrashError("writing-gone");
		if (
			(row.kind === "writing" && existing) ||
			data.chapters.some((chapter) =>
				tx
					.select()
					.from(writingChapters)
					.where(eq(writingChapters.id, chapter.id))
					.get(),
			) ||
			data.notes.some((note) => {
				const existing = tx
					.select()
					.from(writingNotes)
					.where(eq(writingNotes.id, note.id))
					.get();
				return (
					existing &&
					!(
						data.preservedNoteIds?.includes(note.id) &&
						note.projectId !== null &&
						existing.projectId === note.projectId &&
						existing.writingId === null &&
						existing.chapterId === null &&
						existing.parentId ===
							(note.parentId !== null &&
							(data.preservedNoteIds?.includes(note.parentId) ||
								!data.notes.some((saved) => saved.id === note.parentId))
								? note.parentId
								: null)
					)
				);
			})
		)
			throw new TrashError("id-conflict");
		if (row.kind === "writing" && data.writing)
			tx.insert(writings).values(data.writing).run();
		if (row.kind === "chapter") {
			const chapter = data.chapters[0];
			if (!chapter) return null;
			const siblings = tx
				.select()
				.from(writingChapters)
				.where(eq(writingChapters.writingId, chapter.writingId))
				.all();
			chapter.position = Math.min(chapter.position, siblings.length);
			tx.update(writingChapters)
				.set({ position: sql`${writingChapters.position} + 1` })
				.where(
					and(
						eq(writingChapters.writingId, chapter.writingId),
						gte(writingChapters.position, chapter.position),
					),
				)
				.run();
		}
		for (const chapter of data.chapters)
			tx.insert(writingChapters).values(chapter).run();
		const root = data.notes.find((note) => note.id === data.rootId);
		if (row.kind === "note" && root) {
			const parent =
				root.parentId === null
					? undefined
					: tx
							.select()
							.from(writingNotes)
							.where(eq(writingNotes.id, root.parentId))
							.get();
			const chapter =
				root.chapterId === null
					? undefined
					: tx
							.select()
							.from(writingChapters)
							.where(eq(writingChapters.id, root.chapterId))
							.get();
			const validParent =
				parent &&
				(writingId === null
					? root.projectId !== null && parent.projectId === root.projectId
					: parent.writingId === writingId)
					? parent
					: undefined;
			root.parentId = validParent?.id ?? null;
			const chapterId =
				writingId === null
					? null
					: validParent
						? validParent.chapterId
						: chapter?.writingId === writingId
							? chapter.id
							: null;
			for (const note of data.notes)
				if (note.writingId === writingId) note.chapterId = chapterId;
			const siblings = tx
				.select()
				.from(writingNotes)
				.where(
					writingId === null
						? isNull(writingNotes.writingId)
						: eq(writingNotes.writingId, writingId),
				)
				.all()
				.filter(
					(note) =>
						note.parentId === root.parentId &&
						note.chapterId === root.chapterId,
				);
			root.position =
				Math.max(-1, ...siblings.map((note) => note.position)) + 1;
		}
		// Insert parents first; ids do not necessarily reflect the current tree order.
		const pending = [...data.notes];
		while (pending.length) {
			const index = pending.findIndex(
				(note) =>
					note.parentId === null ||
					!pending.some((parent) => parent.id === note.parentId),
			);
			if (index < 0) throw new Error("Invalid trash note tree");
			const note = pending.splice(index, 1)[0];
			if (!note) continue;
			if (
				note.parentId !== null &&
				!tx
					.select()
					.from(writingNotes)
					.where(eq(writingNotes.id, note.parentId))
					.get()
			)
				note.parentId = null;
			const live = tx
				.select()
				.from(writingNotes)
				.where(eq(writingNotes.id, note.id))
				.get();
			if (live)
				tx.update(writingNotes)
					.set({
						writingId: note.writingId,
						chapterId: note.chapterId,
						parentId: note.parentId,
						position: note.position,
					})
					.where(eq(writingNotes.id, note.id))
					.run();
			else tx.insert(writingNotes).values(note).run();
		}
		for (const chapter of data.chapters)
			replaceNoteLinks(tx, { chapterId: chapter.id }, chapter.content);
		for (const note of data.notes) {
			const live = tx
				.select()
				.from(writingNotes)
				.where(eq(writingNotes.id, note.id))
				.get();
			replaceNoteLinks(tx, { noteId: note.id }, live?.content ?? null);
		}
		touchWriting(tx, writingId, now);
		tx.delete(writingTrash).where(eq(writingTrash.id, trashId)).run();
		return { kind: row.kind, id: data.rootId, writingId };
	});
};
