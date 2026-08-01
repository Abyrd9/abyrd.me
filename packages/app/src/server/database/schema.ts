import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const kindleBooks = sqliteTable("kindle_books", {
	asin: text("asin").primaryKey(),
	title: text("title").notNull(),
	author: text("author").notNull().default(""),
	coverUrl: text("cover_url"),
	lastAnnotatedAt: text("last_annotated_at"),
	lastSyncedAt: integer("last_synced_at").notNull(),
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
		sourceUrl: text("source_url"),
		sourceNote: text("source_note"),
		createdAt: integer("created_at").notNull(),
		updatedAt: integer("updated_at").notNull(),
	},
	(table) => [index("quotes_created_at_idx").on(table.createdAt)],
);
