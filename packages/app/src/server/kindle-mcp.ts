import { createHash, timingSafeEqual } from "node:crypto";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
	McpServer,
	WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { Effect } from "effect";
import { $getRoot, createEditor } from "lexical";
import { z } from "zod";
import { initializeDatabase } from "./database/service";
import {
	loadKindleLibrary,
	setKindleAnnotationArchived,
	setKindleBookArchived,
} from "./kindle";
import { applyKindlePersonalEdit, personalEditSchema } from "./kindle-personal";
import { loadQuotes } from "./quotes";

const textResult = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const plainText = (content: string | null) => {
	if (!content) return null;
	try {
		const editor = createEditor({
			nodes: [LinkNode, ListNode, ListItemNode, HeadingNode, QuoteNode],
			onError: (error) => {
				throw error;
			},
		});
		return editor
			.parseEditorState(content)
			.read(() => $getRoot().getTextContent());
	} catch {
		return null;
	}
};

export async function handleKindleMcp(request: Request) {
	const hostname = new URL(request.url).hostname;
	const isLocal =
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]";
	const localToken =
		!process.env.APP_MCP_TOKEN &&
		process.env.NODE_ENV === "development" &&
		isLocal &&
		!process.env.RAILWAY_ENVIRONMENT_NAME
			? await Bun.secrets
					.get({ service: "me.abyrd.kindle-mcp.local", name: "token" })
					.catch(() => null)
			: null;
	const token = process.env.APP_MCP_TOKEN || localToken;
	const provided = request.headers
		.get("authorization")
		?.match(/^Bearer ([^\s]+)$/i)?.[1];
	if (
		!token ||
		token.length < 32 ||
		!provided ||
		!timingSafeEqual(
			createHash("sha256").update(token).digest(),
			createHash("sha256").update(provided).digest(),
		)
	) {
		return new Response("Unauthorized", {
			status: 401,
			headers: {
				"Cache-Control": "no-store",
				"WWW-Authenticate": 'Bearer realm="kindle"',
			},
		});
	}
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin)
		return new Response("Forbidden", {
			status: 403,
			headers: { "Cache-Control": "no-store" },
		});
	const server = new McpServer({ name: "personal-kindle", version: "1.0.0" });
	const database = await Effect.runPromise(
		initializeDatabase.pipe(Effect.orDie),
	);
	const client = database.client;

	server.registerTool(
		"list_books",
		{
			description: "List Kindle books, including archived books.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({}),
		},
		() => textResult(loadKindleLibrary(client).books),
	);
	server.registerTool(
		"read_book",
		{
			description:
				"Read one Kindle book, its chapters, active and archived highlights, and personal notes. Synced text is read-only.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({ asin: z.string().min(1).max(100) }),
		},
		({ asin }) => {
			const active = loadKindleLibrary(client);
			const archived = loadKindleLibrary(client, true);
			const book = active.books.find((entry) => entry.asin === asin);
			if (!book) return { isError: true, ...textResult("Book not found.") };
			const highlights = (items: typeof active.annotations) =>
				items
					.filter((item) => item.bookAsin === asin)
					.map((item) => ({
						...item,
						commentaryText: plainText(item.commentary),
					}));
			return textResult({
				book: { ...book, synopsisText: plainText(book.synopsis) },
				chapters: active.chapters
					.filter((chapter) => chapter.bookAsin === asin)
					.map((chapter) => ({
						...chapter,
						synopsisText: plainText(chapter.synopsis),
					})),
				activeHighlights: highlights(active.annotations),
				archivedHighlights: highlights(archived.annotations),
			});
		},
	);
	server.registerTool(
		"list_quotes",
		{
			description: "Read your separate quote library.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({}),
		},
		() => textResult(loadQuotes(client)),
	);
	server.registerTool(
		"edit_personal",
		{
			description:
				"Create, rename, reorder chapters; assign highlights; or save personal book/chapter synopses and highlight commentary. Never edits Kindle-synced text. For save actions, content is Lexical JSON and previous is the exact current document or null; first read the book to prevent overwriting newer edits. Supported actions: createChapter, renameChapter, moveChapter, assignChapter, saveBook, saveChapter, saveCommentary.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				action: z.enum([
					"createChapter",
					"renameChapter",
					"moveChapter",
					"assignChapter",
					"saveBook",
					"saveChapter",
					"saveCommentary",
				]),
				asin: z.string().optional(),
				id: z.number().int().positive().optional(),
				title: z.string().optional(),
				direction: z.enum(["up", "down"]).optional(),
				chapterId: z.number().int().positive().nullable().optional(),
				content: z.string().optional(),
				previous: z.string().nullable().optional(),
			}),
		},
		(input) => {
			const data = personalEditSchema.parse(input);
			applyKindlePersonalEdit(client, data);
			return textResult({ ok: true });
		},
	);
	server.registerTool(
		"set_archive",
		{
			description:
				"Archive or restore a Kindle book or individual highlight without changing imported text. Restoring a highlight in an archived book also restores the book; individually archived highlights remain archived.",
			annotations: { readOnlyHint: false },
			inputSchema: z.discriminatedUnion("kind", [
				z.object({
					kind: z.literal("book"),
					asin: z.string().min(1).max(100),
					archived: z.boolean(),
				}),
				z.object({
					kind: z.literal("highlight"),
					id: z.number().int().positive(),
					archived: z.boolean(),
				}),
			]),
		},
		(input) => {
			if (input.kind === "book")
				setKindleBookArchived(client, input.asin, input.archived);
			else setKindleAnnotationArchived(client, input.id, input.archived);
			return textResult({ ok: true });
		},
	);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
		maxRequestBodySize: 1024 * 1024,
	});
	await server.connect(transport);
	const response = await transport.handleRequest(request);
	response.headers.set("Cache-Control", "no-store");
	return response;
}
