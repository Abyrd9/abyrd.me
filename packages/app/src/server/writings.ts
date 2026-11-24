import { and, asc, count, desc, eq, gt, lt, max, sql, sum } from "drizzle-orm";
import type { PageSizeId } from "#/writing-page-sizes";
import { writingChapters, writings } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";

const PREVIEW_CHARACTERS = 600;

export type PreviewBlock = {
	/** "block" covers quotes, lists, and other blocks that are not plain prose. */
	kind: "heading" | "paragraph" | "block";
	text: string;
};

/** The opening blocks of a saved chapter, as plain text for the library thumbnail. */
export function previewBlocks(content: string | null) {
	if (!content) return [];
	let state: unknown;
	try {
		state = JSON.parse(content);
	} catch {
		return [];
	}

	const blocks: PreviewBlock[] = [];
	let remaining = PREVIEW_CHARACTERS;
	for (const node of childrenOf(childOf(state, "root"))) {
		if (remaining <= 0) break;
		const text = textOf(node).trim();
		if (!text) continue;
		const type = typeOf(node);
		blocks.push({
			kind:
				type === "heading"
					? "heading"
					: type === "paragraph"
						? "paragraph"
						: "block",
			text: text.slice(0, remaining),
		});
		remaining -= text.length;
	}
	return blocks;
}

const childOf = (value: unknown, key: string) =>
	value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;

const childrenOf = (value: unknown) => {
	const children = childOf(value, "children");
	return Array.isArray(children) ? children : [];
};

const typeOf = (value: unknown) => childOf(value, "type");

const textOf = (value: unknown): string => {
	const text = childOf(value, "text");
	if (typeof text === "string") return text;
	return childrenOf(value).map(textOf).join("");
};

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
		.all();
	return { ...writing, chapters };
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
	db.delete(writings).where(eq(writings.id, id)).run();
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
		return chapter;
	});
}

export function updateChapter(
	db: AppDatabaseClient,
	id: number,
	changes: { title?: string; content?: string; wordCount?: number },
	now = Date.now(),
) {
	return db.transaction((tx) => {
		const chapter = tx
			.update(writingChapters)
			.set({ ...changes, updatedAt: now })
			.where(eq(writingChapters.id, id))
			.returning({
				id: writingChapters.id,
				writingId: writingChapters.writingId,
			})
			.get();
		if (chapter) touchWriting(tx, chapter.writingId, now);
		return chapter ?? null;
	});
}

/** Deletes a chapter unless it is the writing's last one. */
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

type Transaction = Parameters<
	Parameters<AppDatabaseClient["transaction"]>[0]
>[0];

function touchWriting(tx: Transaction, writingId: number, now: number) {
	tx.update(writings)
		.set({ updatedAt: now })
		.where(eq(writings.id, writingId))
		.run();
}
