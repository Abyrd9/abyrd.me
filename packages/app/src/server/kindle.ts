import { createHash } from "node:crypto";
import { desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Data, Effect } from "effect";
import {
	kindleAnnotations,
	kindleBooks,
	kindleSyncRuns,
} from "./database/schema";
import type { AppDatabaseClient } from "./database/service";

export type KindleAnnotationInput = {
	highlight?: string;
	note?: string;
	location?: string;
	page?: string;
	addedAt?: string;
};

export type KindleBookInput = {
	asin: string;
	title: string;
	author: string;
	lastAnnotatedAt: string;
	annotations: readonly KindleAnnotationInput[];
};

export type KindleImport = {
	books: readonly KindleBookInput[];
	errors: readonly string[];
};

export class KindleImportError extends Data.TaggedError("KindleImportError")<{
	readonly message: string;
}> {}

const clean = (value: string | undefined) => value?.trim() ?? "";

const sourceKeyFor = (bookAsin: string, annotation: KindleAnnotationInput) =>
	createHash("sha256")
		.update(
			JSON.stringify([
				bookAsin,
				clean(annotation.location),
				clean(annotation.page),
				clean(annotation.highlight),
				clean(annotation.note),
			]),
		)
		.digest("base64url");

export const parseKindleImport = (
	value: unknown,
): Effect.Effect<KindleImport, KindleImportError> =>
	Effect.try({
		try: () => {
			if (!isRecord(value) || !Array.isArray(value.books))
				throw new Error("The import needs a books list.");
			if (value.books.length > 5_000)
				throw new Error("The import has too many books.");
			const books = value.books.map((rawBook, bookIndex) =>
				parseBook(rawBook, bookIndex),
			);
			const errors = value.errors ?? [];
			if (
				!Array.isArray(errors) ||
				errors.some((error) => typeof error !== "string")
			)
				throw new Error("The import errors are invalid.");
			return { books, errors: errors.map((error) => error.slice(0, 500)) };
		},
		catch: (error) =>
			new KindleImportError({
				message:
					error instanceof Error ? error.message : "Invalid Kindle import.",
			}),
	});

export function importKindleBooks(
	db: AppDatabaseClient,
	imported: KindleImport,
) {
	const startedAt = Date.now();
	const run = db
		.insert(kindleSyncRuns)
		.values({ startedAt, status: "running" })
		.returning({ id: kindleSyncRuns.id })
		.get();
	try {
		let annotationCount = 0;
		db.transaction((transaction) => {
			for (const book of imported.books) {
				transaction
					.insert(kindleBooks)
					.values({
						asin: book.asin,
						title: book.title,
						author: book.author,
						lastAnnotatedAt: book.lastAnnotatedAt || null,
						lastSyncedAt: startedAt,
					})
					.onConflictDoUpdate({
						target: kindleBooks.asin,
						set: {
							title: book.title,
							author: book.author,
							lastAnnotatedAt: book.lastAnnotatedAt || null,
							lastSyncedAt: startedAt,
						},
					})
					.run();
				for (const [position, annotation] of book.annotations.entries()) {
					transaction
						.insert(kindleAnnotations)
						.values({
							bookAsin: book.asin,
							sourceKey: sourceKeyFor(book.asin, annotation),
							position,
							highlight: clean(annotation.highlight) || null,
							note: clean(annotation.note) || null,
							location: clean(annotation.location) || null,
							page: clean(annotation.page) || null,
							addedAt: clean(annotation.addedAt) || null,
							firstSeenAt: startedAt,
							lastSeenAt: startedAt,
						})
						.onConflictDoUpdate({
							target: kindleAnnotations.sourceKey,
							set: {
								position,
								highlight: clean(annotation.highlight) || null,
								note: clean(annotation.note) || null,
								location: clean(annotation.location) || null,
								page: clean(annotation.page) || null,
								addedAt: clean(annotation.addedAt) || null,
								lastSeenAt: startedAt,
							},
						})
						.run();
					annotationCount += 1;
				}
			}
		});
		const status = imported.errors.length ? "partial" : "success";
		db.update(kindleSyncRuns)
			.set({
				finishedAt: Date.now(),
				status,
				bookCount: imported.books.length,
				annotationCount,
				error: imported.errors.join("\n").slice(0, 500) || null,
			})
			.where(eq(kindleSyncRuns.id, run.id))
			.run();
		return { status, bookCount: imported.books.length, annotationCount };
	} catch (error) {
		db.update(kindleSyncRuns)
			.set({
				finishedAt: Date.now(),
				status: "failed",
				error:
					error instanceof Error
						? error.message.slice(0, 500)
						: "Import failed.",
			})
			.where(eq(kindleSyncRuns.id, run.id))
			.run();
		throw error;
	}
}

export function loadKindleLibrary(db: AppDatabaseClient, archived = false) {
	return {
		annotations: db
			.select({
				id: kindleAnnotations.id,
				bookAsin: kindleAnnotations.bookAsin,
				highlight: kindleAnnotations.highlight,
				note: kindleAnnotations.note,
				location: kindleAnnotations.location,
				page: kindleAnnotations.page,
				addedAt: kindleAnnotations.addedAt,
				archivedAt: kindleAnnotations.archivedAt,
				title: kindleBooks.title,
				author: kindleBooks.author,
			})
			.from(kindleAnnotations)
			.innerJoin(kindleBooks, eq(kindleAnnotations.bookAsin, kindleBooks.asin))
			.where(
				archived
					? isNotNull(kindleAnnotations.archivedAt)
					: isNull(kindleAnnotations.archivedAt),
			)
			.orderBy(desc(kindleAnnotations.lastSeenAt))
			.all(),
		lastSync:
			db
				.select()
				.from(kindleSyncRuns)
				.orderBy(desc(kindleSyncRuns.startedAt))
				.get() ?? null,
	};
}

export function setKindleAnnotationArchived(
	db: AppDatabaseClient,
	id: number,
	archived: boolean,
) {
	db.update(kindleAnnotations)
		.set({ archivedAt: archived ? Date.now() : null })
		.where(eq(kindleAnnotations.id, id))
		.run();
}

export function setKindleBookArchived(
	db: AppDatabaseClient,
	bookAsin: string,
	archived: boolean,
) {
	db.update(kindleAnnotations)
		.set({ archivedAt: archived ? Date.now() : null })
		.where(eq(kindleAnnotations.bookAsin, bookAsin))
		.run();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readText(value: unknown, name: string, required = false) {
	if (typeof value !== "string") {
		if (!required && (value === undefined || value === null)) return "";
		throw new Error(`${name} must be text.`);
	}
	const text = value.trim();
	if (required && !text) throw new Error(`${name} is required.`);
	if (text.length > 100_000) throw new Error(`${name} is too long.`);
	return text;
}
function parseBook(value: unknown, index: number): KindleBookInput {
	if (!isRecord(value) || !Array.isArray(value.annotations))
		throw new Error(`Book ${index + 1} is invalid.`);
	return {
		asin: readText(value.asin, "Book ASIN", true),
		title: readText(value.title, "Book title", true),
		author: readText(value.author, "Book author"),
		lastAnnotatedAt: readText(
			value.lastAnnotatedAt ?? value.lastAnnotated,
			"Book annotation date",
		),
		annotations: value.annotations.map((annotation, annotationIndex) => {
			if (!isRecord(annotation))
				throw new Error(`Annotation ${annotationIndex + 1} is invalid.`);
			const parsed = {
				highlight: readText(annotation.highlight, "Highlight"),
				note: readText(annotation.note, "Note"),
				location: readText(annotation.location, "Location"),
				page: readText(annotation.page, "Page"),
				addedAt: readText(annotation.addedAt ?? annotation.added, "Added date"),
			};
			if (!parsed.highlight && !parsed.note)
				throw new Error(
					`Annotation ${annotationIndex + 1} needs a highlight or note.`,
				);
			return parsed;
		}),
	};
}
