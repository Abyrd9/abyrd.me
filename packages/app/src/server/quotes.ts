import { desc, eq } from "drizzle-orm";
import { quotes } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";

export type QuoteInput = {
	readonly text: string;
	readonly attribution?: string | null;
	readonly sourceUrl?: string | null;
	readonly sourceNote?: string | null;
	readonly createdAt?: number;
	readonly updatedAt?: number;
};

export function loadQuotes(db: AppDatabaseClient) {
	return db
		.select({
			id: quotes.id,
			text: quotes.text,
			attribution: quotes.attribution,
			sourceUrl: quotes.sourceUrl,
			sourceNote: quotes.sourceNote,
			createdAt: quotes.createdAt,
			updatedAt: quotes.updatedAt,
		})
		.from(quotes)
		.orderBy(desc(quotes.createdAt), desc(quotes.id))
		.all();
}

export function createQuote(db: AppDatabaseClient, input: QuoteInput) {
	const now = input.createdAt ?? Date.now();

	return db
		.insert(quotes)
		.values({
			text: input.text,
			attribution: input.attribution ?? null,
			sourceUrl: input.sourceUrl ?? null,
			sourceNote: input.sourceNote ?? null,
			createdAt: now,
			updatedAt: input.updatedAt ?? now,
		})
		.returning()
		.get();
}

export function updateQuote(
	db: AppDatabaseClient,
	id: number,
	input: QuoteInput,
) {
	return db
		.update(quotes)
		.set({
			text: input.text,
			attribution: input.attribution ?? null,
			sourceUrl: input.sourceUrl ?? null,
			sourceNote: input.sourceNote ?? null,
			updatedAt: input.updatedAt ?? Date.now(),
		})
		.where(eq(quotes.id, id))
		.returning()
		.get();
}

export function deleteQuote(db: AppDatabaseClient, id: number) {
	db.delete(quotes).where(eq(quotes.id, id)).run();
}
