import { sql } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	check,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const kindleBooks = sqliteTable("kindle_books", {
	asin: text("asin").primaryKey(),
	title: text("title").notNull(),
	author: text("author").notNull().default(""),
	coverUrl: text("cover_url"),
	lastAnnotatedAt: text("last_annotated_at"),
	lastSyncedAt: integer("last_synced_at").notNull(),
	synopsis: text("synopsis"),
	archivedAt: integer("archived_at"),
});

export const kindleChapters = sqliteTable("kindle_chapters", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	bookAsin: text("book_asin")
		.notNull()
		.references(() => kindleBooks.asin, { onDelete: "cascade" }),
	title: text("title").notNull(),
	position: integer("position").notNull(),
	synopsis: text("synopsis"),
});

export const kindleAnnotations = sqliteTable(
	"kindle_annotations",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		bookAsin: text("book_asin")
			.notNull()
			.references(() => kindleBooks.asin, { onDelete: "cascade" }),
		sourceKey: text("source_key").notNull().unique(),
		position: integer("position").notNull(),
		highlight: text("highlight"),
		note: text("note"),
		location: text("location"),
		page: text("page"),
		addedAt: text("added_at"),
		firstSeenAt: integer("first_seen_at").notNull(),
		lastSeenAt: integer("last_seen_at").notNull(),
		archivedAt: integer("archived_at"),
		chapterId: integer("chapter_id").references(() => kindleChapters.id, {
			onDelete: "set null",
		}),
		commentary: text("commentary"),
	},
	(table) => [
		index("kindle_annotations_book_asin_idx").on(table.bookAsin),
		index("kindle_annotations_archived_at_idx").on(table.archivedAt),
	],
);

export const kindleSyncRuns = sqliteTable("kindle_sync_runs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	startedAt: integer("started_at").notNull(),
	finishedAt: integer("finished_at"),
	status: text("status").notNull(),
	bookCount: integer("book_count").notNull().default(0),
	annotationCount: integer("annotation_count").notNull().default(0),
	error: text("error"),
});

export const quotes = sqliteTable(
	"quotes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		text: text("text").notNull(),
		attribution: text("attribution"),
		sourceTitle: text("source_title"),
		sourceUrl: text("source_url"),
		sourceNote: text("source_note"),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [index("quotes_created_at_idx").on(table.createdAt)],
);

/** A world or series: writings that share one wiki of project notes. */
export const projects = sqliteTable("projects", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const writings = sqliteTable(
	"writings",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		title: text("title").notNull(),
		pageSize: text("page_size").notNull().default("trade"),
		/** The one project this writing belongs to, if any. */
		projectId: integer("project_id").references(() => projects.id, {
			onDelete: "set null",
		}),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [
		index("writings_updated_at_idx").on(table.updatedAt),
		index("writings_project_id_idx").on(table.projectId),
	],
);

export const writingChapters = sqliteTable(
	"writing_chapters",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		writingId: integer("writing_id")
			.notNull()
			.references(() => writings.id, { onDelete: "cascade" }),
		title: text("title").notNull().default(""),
		position: integer("position").notNull(),
		/** Serialized Lexical editor state, or null for a chapter never typed in. */
		content: text("content"),
		wordCount: integer("word_count").notNull().default(0),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [index("writing_chapters_writing_id_idx").on(table.writingId)],
);

/**
 * Notes that sit beside a writing. A note belongs to the whole writing when
 * chapterId is null, or to one chapter, and nests under parentId. Children
 * always share their parent's writing and chapter; deleting a chapter or a
 * note deletes everything beneath it.
 *
 * A note with a projectId is a project note: the one copy every writing in
 * the project reads and edits. Its writingId and chapterId then only say
 * where it is attached, and are null for a note made in the project's wiki.
 * These foreign keys still cascade, so code that deletes a writing, chapter,
 * or note calls keepProjectNotes first; see writing-notes.ts.
 */
export const writingNotes = sqliteTable(
	"writing_notes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		writingId: integer("writing_id").references(() => writings.id, {
			onDelete: "cascade",
		}),
		projectId: integer("project_id").references(() => projects.id),
		chapterId: integer("chapter_id").references(() => writingChapters.id, {
			onDelete: "cascade",
		}),
		parentId: integer("parent_id").references(
			(): AnySQLiteColumn => writingNotes.id,
			{ onDelete: "cascade" },
		),
		title: text("title").notNull().default(""),
		position: integer("position").notNull(),
		/** Serialized Lexical editor state, or null for a note never typed in. */
		content: text("content"),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [
		index("writing_notes_writing_id_idx").on(table.writingId),
		index("writing_notes_parent_id_idx").on(table.parentId),
		index("writing_notes_chapter_id_idx").on(table.chapterId),
		index("writing_notes_project_id_idx").on(table.projectId),
		check(
			"writing_notes_has_home",
			sql`${table.writingId} IS NOT NULL OR ${table.projectId} IS NOT NULL`,
		),
	],
);

/**
 * Wiki links found in saved text, rebuilt each time a chapter or note saves.
 * Exactly one source column is set. context is the text of the block that
 * holds the link, shown in the target's "Linked from" list.
 */
export const noteLinks = sqliteTable(
	"note_links",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		sourceChapterId: integer("source_chapter_id").references(
			() => writingChapters.id,
			{ onDelete: "cascade" },
		),
		sourceNoteId: integer("source_note_id").references(() => writingNotes.id, {
			onDelete: "cascade",
		}),
		targetNoteId: integer("target_note_id")
			.notNull()
			.references(() => writingNotes.id, { onDelete: "cascade" }),
		context: text("context").notNull().default(""),
	},
	(table) => [
		index("note_links_target_idx").on(table.targetNoteId),
		index("note_links_source_chapter_idx").on(table.sourceChapterId),
		index("note_links_source_note_idx").on(table.sourceNoteId),
		check(
			"note_links_one_source",
			sql`(${table.sourceChapterId} IS NULL) <> (${table.sourceNoteId} IS NULL)`,
		),
	],
);

/** Words the writer has added to the spell checker's dictionary. */
export const dictionaryWords = sqliteTable("dictionary_words", {
	word: text("word").primaryKey(),
	createdAt: integer("created_at").notNull(),
});

export const writingTrash = sqliteTable(
	"writing_trash",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		kind: text("kind", { enum: ["writing", "chapter", "note"] }).notNull(),
		title: text("title").notNull(),
		/** Null for a project note that was attached to no writing. */
		writingId: integer("writing_id"),
		writingTitle: text("writing_title"),
		snapshot: text("snapshot").notNull(),
		deletedAt: integer("deleted_at").notNull(),
	},
	(table) => [index("writing_trash_deleted_at_idx").on(table.deletedAt)],
);

export const writingSuggestions = sqliteTable(
	"writing_suggestions",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		chapterId: integer("chapter_id")
			.notNull()
			.references(() => writingChapters.id, { onDelete: "cascade" }),
		passage: text("passage").notNull(),
		alternatives: text("alternatives", { mode: "json" })
			.$type<Array<{ text: string; reason: string | null }>>()
			.notNull(),
		status: text("status", {
			enum: ["pending", "accepted", "declined", "withdrawn"],
		}).notNull(),
		acceptedIndex: integer("accepted_index"),
		createdAt: integer("created_at").notNull(),
		resolvedAt: integer("resolved_at"),
	},
	(table) => [index("writing_suggestions_chapter_id_idx").on(table.chapterId)],
);
