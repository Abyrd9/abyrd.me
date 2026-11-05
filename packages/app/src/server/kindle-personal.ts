import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { and, eq, sql } from "drizzle-orm";
import { createEditor } from "lexical";
import { z } from "zod";
import {
	kindleAnnotations,
	kindleBooks,
	kindleChapters,
} from "./database/schema";
import type { AppDatabaseClient } from "./database/service";

const richTextSchema = z
	.string()
	.max(200000)
	.refine((content) => {
		try {
			const document: unknown = JSON.parse(content);
			const editor = createEditor({
				nodes: [LinkNode, ListItemNode, ListNode, HeadingNode, QuoteNode],
				onError: (error) => {
					throw error;
				},
			});
			editor.parseEditorState(content);
			const visit = (node: unknown, depth: number): boolean => {
				if (
					!node ||
					typeof node !== "object" ||
					depth > 50 ||
					Array.isArray(node)
				)
					return false;
				const item = Object.fromEntries(Object.entries(node));
				if (
					![
						"root",
						"paragraph",
						"text",
						"linebreak",
						"heading",
						"quote",
						"list",
						"listitem",
						"link",
					].includes(item.type)
				)
					return false;
				if (item.type === "link") {
					if (typeof item.url !== "string") return false;
					const url = new URL(item.url);
					if (!["http:", "https:", "mailto:"].includes(url.protocol))
						return false;
				}
				return (
					item.children === undefined ||
					(Array.isArray(item.children) &&
						item.children.every((child: unknown) => visit(child, depth + 1)))
				);
			};
			return (
				typeof document === "object" &&
				document !== null &&
				"root" in document &&
				typeof document.root === "object" &&
				document.root !== null &&
				"type" in document.root &&
				document.root.type === "root" &&
				visit(document.root, 0)
			);
		} catch {
			return false;
		}
	}, "Invalid rich text document.");

export const personalEditSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("createChapter"),
		asin: z.string().min(1).max(100),
		title: z.string().trim().min(1).max(200),
	}),
	z.object({
		action: z.literal("renameChapter"),
		id: z.number().int().positive(),
		title: z.string().trim().min(1).max(200),
	}),
	z.object({
		action: z.literal("moveChapter"),
		id: z.number().int().positive(),
		direction: z.enum(["up", "down"]),
	}),
	z.object({
		action: z.literal("deleteChapter"),
		id: z.number().int().positive(),
		previous: z.string().max(200000).nullable(),
	}),
	z.object({
		action: z.literal("assignChapter"),
		id: z.number().int().positive(),
		chapterId: z.number().int().positive().nullable(),
	}),
	z.object({
		action: z.literal("saveBook"),
		asin: z.string().min(1).max(100),
		content: richTextSchema,
		previous: z.string().max(200000).nullable(),
	}),
	z.object({
		action: z.literal("saveChapter"),
		id: z.number().int().positive(),
		content: richTextSchema,
		previous: z.string().max(200000).nullable(),
	}),
	z.object({
		action: z.literal("saveCommentary"),
		id: z.number().int().positive(),
		content: richTextSchema,
		previous: z.string().max(200000).nullable(),
	}),
]);

export const applyKindlePersonalEdit = (
	client: AppDatabaseClient,
	data: z.infer<typeof personalEditSchema>,
) => {
	if (data.action === "createChapter") {
		const last = client
			.select({
				position: sql<number>`coalesce(max(${kindleChapters.position}), -1)`,
			})
			.from(kindleChapters)
			.where(eq(kindleChapters.bookAsin, data.asin))
			.get();
		client
			.insert(kindleChapters)
			.values({
				bookAsin: data.asin,
				title: data.title,
				position: (last?.position ?? -1) + 1,
			})
			.run();
	} else if (data.action === "renameChapter") {
		const updated = client
			.update(kindleChapters)
			.set({ title: data.title })
			.where(eq(kindleChapters.id, data.id))
			.returning({ id: kindleChapters.id })
			.get();
		if (!updated) throw new Error("Chapter not found.");
	} else if (data.action === "deleteChapter") {
		client.transaction((tx) => {
			const deleted = tx
				.delete(kindleChapters)
				.where(
					and(
						eq(kindleChapters.id, data.id),
						sql`${kindleChapters.synopsis} IS ${data.previous}`,
					),
				)
				.returning({ id: kindleChapters.id })
				.get();
			if (!deleted) throw new Error("Chapter changed; reload before deleting.");
			tx.update(kindleAnnotations)
				.set({ chapterId: null })
				.where(eq(kindleAnnotations.chapterId, data.id))
				.run();
		});
	} else if (data.action === "moveChapter") {
		const chapter = client
			.select()
			.from(kindleChapters)
			.where(eq(kindleChapters.id, data.id))
			.get();
		if (!chapter) throw new Error("Chapter not found.");
		const chapters = client
			.select()
			.from(kindleChapters)
			.where(eq(kindleChapters.bookAsin, chapter.bookAsin))
			.orderBy(kindleChapters.position, kindleChapters.id)
			.all();
		const index = chapters.findIndex((item) => item.id === chapter.id);
		const other = chapters[index + (data.direction === "up" ? -1 : 1)];
		if (other)
			client.transaction((tx) => {
				tx.update(kindleChapters)
					.set({ position: other.position })
					.where(eq(kindleChapters.id, chapter.id))
					.run();
				tx.update(kindleChapters)
					.set({ position: chapter.position })
					.where(eq(kindleChapters.id, other.id))
					.run();
			});
	} else if (data.action === "assignChapter") {
		const annotation = client
			.select()
			.from(kindleAnnotations)
			.where(eq(kindleAnnotations.id, data.id))
			.get();
		if (!annotation) throw new Error("Highlight not found.");
		if (
			data.chapterId !== null &&
			!client
				.select()
				.from(kindleChapters)
				.where(
					and(
						eq(kindleChapters.id, data.chapterId),
						eq(kindleChapters.bookAsin, annotation.bookAsin),
					),
				)
				.get()
		)
			throw new Error("Chapter must belong to the same book.");
		client
			.update(kindleAnnotations)
			.set({ chapterId: data.chapterId })
			.where(eq(kindleAnnotations.id, data.id))
			.run();
	} else if (data.action === "saveBook") {
		if (
			!client
				.update(kindleBooks)
				.set({ synopsis: data.content })
				.where(
					and(
						eq(kindleBooks.asin, data.asin),
						sql`${kindleBooks.synopsis} IS ${data.previous}`,
					),
				)
				.returning({ id: kindleBooks.asin })
				.get()
		)
			throw new Error("Book synopsis changed; reload before saving.");
	} else if (data.action === "saveChapter") {
		if (
			!client
				.update(kindleChapters)
				.set({ synopsis: data.content })
				.where(
					and(
						eq(kindleChapters.id, data.id),
						sql`${kindleChapters.synopsis} IS ${data.previous}`,
					),
				)
				.returning({ id: kindleChapters.id })
				.get()
		)
			throw new Error("Chapter synopsis changed; reload before saving.");
	} else {
		if (
			!client
				.update(kindleAnnotations)
				.set({ commentary: data.content })
				.where(
					and(
						eq(kindleAnnotations.id, data.id),
						sql`${kindleAnnotations.commentary} IS ${data.previous}`,
					),
				)
				.returning({ id: kindleAnnotations.id })
				.get()
		)
			throw new Error("Commentary changed; reload before saving.");
	}
};
