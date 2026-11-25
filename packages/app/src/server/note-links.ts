import { eq, inArray } from "drizzle-orm";
import {
	noteLinks,
	writingChapters,
	writingNotes,
	writings,
} from "./database/schema";
import type { AppDatabaseClient } from "./database/service";
import {
	childOf,
	childrenOf,
	rootBlocks,
	textOf,
	typeOf,
	WIKI_LINK_TYPE,
} from "./lexical-json";

type Transaction = Parameters<
	Parameters<AppDatabaseClient["transaction"]>[0]
>[0];

export type LinkSource = { chapterId: number } | { noteId: number };

const CONTEXT_CHARACTERS = 280;

// The blocks whose text becomes a link's context. A link inside a list item
// takes the item's text, not the whole list's.
const contextBlocks = new Set([
	"paragraph",
	"heading",
	"quote",
	"listitem",
	"epigraph",
	"verse",
	"callout",
	"code",
]);

/** Each note a document links to, once, with the text around its first link. */
export function extractNoteLinks(content: string | null) {
	const found = new Map<number, string>();
	const visit = (node: unknown, block: unknown) => {
		if (typeOf(node) === WIKI_LINK_TYPE) {
			const noteId = childOf(node, "noteId");
			if (
				Number.isInteger(noteId) &&
				typeof noteId === "number" &&
				!found.has(noteId)
			)
				found.set(
					noteId,
					textOf(block)
						.replace(/\s+/g, " ")
						.trim()
						.slice(0, CONTEXT_CHARACTERS),
				);
			return;
		}
		for (const child of childrenOf(node))
			visit(child, contextBlocks.has(String(typeOf(child))) ? child : block);
	};
	for (const block of rootBlocks(content)) visit(block, block);
	return [...found].map(([targetNoteId, context]) => ({
		targetNoteId,
		context,
	}));
}

/**
 * Replaces a chapter's or note's outgoing links with those in its new content.
 * Links to notes that no longer exist, and a note's links to itself, are not
 * stored; the text still shows them.
 */
export function replaceNoteLinks(
	tx: Transaction,
	source: LinkSource,
	content: string | null,
) {
	const fromChapter = "chapterId" in source;
	tx.delete(noteLinks)
		.where(
			fromChapter
				? eq(noteLinks.sourceChapterId, source.chapterId)
				: eq(noteLinks.sourceNoteId, source.noteId),
		)
		.run();

	const links = extractNoteLinks(content).filter(
		(link) => fromChapter || link.targetNoteId !== source.noteId,
	);
	if (!links.length) return;

	const existing = new Set(
		tx
			.select({ id: writingNotes.id })
			.from(writingNotes)
			.where(
				inArray(
					writingNotes.id,
					links.map((link) => link.targetNoteId),
				),
			)
			.all()
			.map((note) => note.id),
	);
	const rows = links
		.filter((link) => existing.has(link.targetNoteId))
		.map((link) => ({
			sourceChapterId: fromChapter ? source.chapterId : null,
			sourceNoteId: fromChapter ? null : source.noteId,
			targetNoteId: link.targetNoteId,
			context: link.context,
		}));
	if (rows.length) tx.insert(noteLinks).values(rows).run();
}

export type Backlink = {
	kind: "chapter" | "note";
	id: number;
	title: string;
	writingId: number | null;
	writingTitle: string | null;
	/** The chapter itself, or the chapter a linking note belongs to. */
	chapterId: number | null;
	chapterPosition: number | null;
	context: string;
};

/** Every chapter and note, in any writing, that links to a note. */
export function loadBacklinks(
	db: AppDatabaseClient,
	noteId: number,
): Backlink[] {
	const fromChapters = db
		.select({
			id: writingChapters.id,
			title: writingChapters.title,
			position: writingChapters.position,
			writingId: writings.id,
			writingTitle: writings.title,
			context: noteLinks.context,
		})
		.from(noteLinks)
		.innerJoin(
			writingChapters,
			eq(noteLinks.sourceChapterId, writingChapters.id),
		)
		.innerJoin(writings, eq(writingChapters.writingId, writings.id))
		.where(eq(noteLinks.targetNoteId, noteId))
		.all()
		.map((row) => ({
			kind: "chapter" as const,
			id: row.id,
			title: row.title,
			writingId: row.writingId,
			writingTitle: row.writingTitle,
			chapterId: row.id,
			chapterPosition: row.position,
			context: row.context,
		}));

	const fromNotes = db
		.select({
			id: writingNotes.id,
			title: writingNotes.title,
			chapterId: writingNotes.chapterId,
			writingId: writings.id,
			writingTitle: writings.title,
			context: noteLinks.context,
		})
		.from(noteLinks)
		.innerJoin(writingNotes, eq(noteLinks.sourceNoteId, writingNotes.id))
		.leftJoin(writings, eq(writingNotes.writingId, writings.id))
		.where(eq(noteLinks.targetNoteId, noteId))
		.all()
		.map((row) => ({
			kind: "note" as const,
			id: row.id,
			title: row.title,
			writingId: row.writingId,
			writingTitle: row.writingTitle,
			chapterId: row.chapterId,
			chapterPosition: null,
			context: row.context,
		}));

	return [...fromChapters, ...fromNotes];
}
