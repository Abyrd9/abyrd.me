import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { quotes } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";

const isHttpUrl = (value: string) => {
	if (!value) return true;
	if (!URL.canParse(value)) return false;
	const { protocol } = new URL(value);
	return protocol === "http:" || protocol === "https:";
};

/** What the app and the MCP server accept for a quote. Empty strings mean "none". */
export const quoteFieldsSchema = z.object({
	text: z.string().trim().min(1, "Enter a quote.").max(10_000),
	attribution: z.string().trim().max(500),
	sourceTitle: z.string().trim().max(500),
	sourceUrl: z
		.string()
		.trim()
		.max(2_048)
		.refine(isHttpUrl, "Enter a valid web address."),
	sourceNote: z.string().trim().max(2_000),
});

export const quoteInput = (data: z.infer<typeof quoteFieldsSchema>) => ({
	text: data.text,
	attribution: data.attribution || null,
	sourceTitle: data.sourceTitle || null,
	sourceUrl: data.sourceUrl || null,
	sourceNote: data.sourceNote || null,
});

export type QuoteInput = {
	readonly text: string;
	readonly attribution?: string | null;
	readonly sourceTitle?: string | null;
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
			sourceTitle: quotes.sourceTitle,
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
			sourceTitle: input.sourceTitle ?? null,
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
			sourceTitle: input.sourceTitle ?? null,
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
