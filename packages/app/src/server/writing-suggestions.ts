import { and, desc, eq } from "drizzle-orm";
import { writingChapters, writingSuggestions } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";
import { childOf, childrenOf, rootBlocks, typeOf } from "./lexical-json";

export class SuggestionError extends Error {}

export type Suggestion = typeof writingSuggestions.$inferSelect;

const inline = (node: unknown) =>
	typeOf(node) === "link" || typeOf(node) === "autolink";

const inlineText = (node: unknown): string => {
	const type = typeOf(node);
	if (type === "linebreak") return "\n";
	if (type === "text" || type === "tab") {
		const text = childOf(node, "text");
		return typeof text === "string" ? text : "";
	}
	return inline(node) ? childrenOf(node).map(inlineText).join("") : "";
};

export const chapterBlockTexts = (content: string | null): string[] => {
	const blocks: string[] = [];
	const visit = (node: unknown) => {
		if (!Array.isArray(childOf(node, "children")) || typeOf(node) === "code")
			return;
		const children = childrenOf(node);
		const nested = children.filter(
			(child) => Array.isArray(childOf(child, "children")) && !inline(child),
		);
		if (nested.length) {
			for (const child of nested) visit(child);
			return;
		}
		const text = children.map(inlineText).join("");
		if (text.trim()) blocks.push(text);
	};
	for (const block of rootBlocks(content)) visit(block);
	return blocks;
};

const matches = (blocks: string[], passage: string) => {
	const found: Array<{ block: number; start: number; end: number }> = [];
	if (!passage) return found;
	for (const [block, text] of blocks.entries()) {
		let start = text.indexOf(passage);
		while (start !== -1) {
			found.push({ block, start, end: start + passage.length });
			start = text.indexOf(passage, start + 1);
		}
	}
	return found;
};

export const createSuggestion = (
	db: AppDatabaseClient,
	input: {
		chapterId: number;
		passage: string;
		alternatives: Array<{ text: string; reason?: string | null }>;
	},
	now = Date.now(),
): Suggestion =>
	db.transaction((tx) => {
		const chapter = tx
			.select()
			.from(writingChapters)
			.where(eq(writingChapters.id, input.chapterId))
			.get();
		if (!chapter)
			throw new SuggestionError(
				"Chapter not found. Read the writing's outline for its chapter ids.",
			);
		if (!input.passage.trim() || input.passage.length > 2000)
			throw new SuggestionError(
				"Give a non-empty passage of at most 2000 characters.",
			);
		if (input.alternatives.length < 1 || input.alternatives.length > 5)
			throw new SuggestionError("Offer between 1 and 5 alternatives.");
		for (const alternative of input.alternatives) {
			if (alternative.text.length > 4000)
				throw new SuggestionError(
					"Each alternative must be at most 4000 characters.",
				);
			if (alternative.text === input.passage)
				throw new SuggestionError(
					"Each alternative must differ from the original passage.",
				);
		}
		const blocks = chapterBlockTexts(chapter.content);
		const found = matches(blocks, input.passage);
		if (!found.length)
			throw new SuggestionError(
				"That passage isn't in the chapter. Copy it exactly from read_chapter's text, without Markdown formatting (no *, **, ==, etc.). A passage must sit within one paragraph.",
			);
		if (found.length !== 1)
			throw new SuggestionError(
				`That passage appears ${found.length} times in the chapter. Include more surrounding words so it matches once.`,
			);
		const target = found[0];
		const pending = tx
			.select()
			.from(writingSuggestions)
			.where(
				and(
					eq(writingSuggestions.chapterId, input.chapterId),
					eq(writingSuggestions.status, "pending"),
				),
			)
			.all();
		for (const suggestion of pending) {
			if (
				matches(blocks, suggestion.passage).some(
					(span) =>
						span.block === target.block &&
						span.start < target.end &&
						target.start < span.end,
				)
			)
				throw new SuggestionError(
					`Another pending suggestion already covers part of that passage (id ${suggestion.id}).`,
				);
		}
		return tx
			.insert(writingSuggestions)
			.values({
				chapterId: input.chapterId,
				passage: input.passage,
				alternatives: input.alternatives.map(({ text, reason }) => ({
					text,
					reason: reason ?? null,
				})),
				status: "pending",
				createdAt: now,
			})
			.returning()
			.get();
	});

export const listSuggestions = (
	db: AppDatabaseClient,
	filter: {
		chapterId?: number;
		writingId?: number;
		status?: Suggestion["status"];
	},
) =>
	db
		.select({
			suggestion: writingSuggestions,
			content: writingChapters.content,
			chapterTitle: writingChapters.title,
		})
		.from(writingSuggestions)
		.innerJoin(
			writingChapters,
			eq(writingSuggestions.chapterId, writingChapters.id),
		)
		.where(
			and(
				filter.chapterId === undefined
					? undefined
					: eq(writingSuggestions.chapterId, filter.chapterId),
				filter.writingId === undefined
					? undefined
					: eq(writingChapters.writingId, filter.writingId),
				filter.status === undefined
					? undefined
					: eq(writingSuggestions.status, filter.status),
			),
		)
		.orderBy(desc(writingSuggestions.createdAt), desc(writingSuggestions.id))
		.all()
		.map(({ suggestion, content, chapterTitle }) => ({
			...suggestion,
			chapterTitle,
			found:
				suggestion.status === "pending" &&
				matches(chapterBlockTexts(content), suggestion.passage).length === 1,
		}));

export const resolveSuggestion = (
	db: AppDatabaseClient,
	id: number,
	outcome: { status: "accepted"; index: number } | { status: "declined" },
	now = Date.now(),
): Suggestion | null =>
	db.transaction((tx) => {
		const suggestion = tx
			.select()
			.from(writingSuggestions)
			.where(
				and(
					eq(writingSuggestions.id, id),
					eq(writingSuggestions.status, "pending"),
				),
			)
			.get();
		if (!suggestion) return null;
		if (
			outcome.status === "accepted" &&
			(!Number.isInteger(outcome.index) ||
				outcome.index < 0 ||
				outcome.index >= suggestion.alternatives.length)
		)
			throw new SuggestionError(
				"Choose an alternative by its zero-based index.",
			);
		return (
			tx
				.update(writingSuggestions)
				.set({
					status: outcome.status,
					acceptedIndex: outcome.status === "accepted" ? outcome.index : null,
					resolvedAt: now,
				})
				.where(
					and(
						eq(writingSuggestions.id, id),
						eq(writingSuggestions.status, "pending"),
					),
				)
				.returning()
				.get() ?? null
		);
	});

export const withdrawSuggestion = (
	db: AppDatabaseClient,
	id: number,
	now = Date.now(),
) =>
	db
		.update(writingSuggestions)
		.set({ status: "withdrawn", resolvedAt: now })
		.where(
			and(
				eq(writingSuggestions.id, id),
				eq(writingSuggestions.status, "pending"),
			),
		)
		.returning({ id: writingSuggestions.id })
		.all().length > 0;
