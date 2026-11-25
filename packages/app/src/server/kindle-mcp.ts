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
import {
	formatKindleCitation,
	formatQuoteCitation,
} from "#/components/citation";
import { initializeDatabase } from "./database/service";
import { getFlashcardDecks } from "./flashcards";
import {
	loadKindleLibrary,
	setKindleAnnotationArchived,
	setKindleBookArchived,
} from "./kindle";
import { applyKindlePersonalEdit, personalEditSchema } from "./kindle-personal";
import {
	createQuote,
	deleteQuote,
	loadQuotes,
	quoteFieldsSchema,
	quoteInput,
	updateQuote,
} from "./quotes";
import { registerWritingTools } from "./writing-mcp";

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
				"WWW-Authenticate": 'Bearer realm="abyrd-app"',
			},
		});
	}
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin)
		return new Response("Forbidden", {
			status: 403,
			headers: { "Cache-Control": "no-store" },
		});
	const server = new McpServer({ name: "abyrd-app", version: "1.2.0" });
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
						citation: formatKindleCitation(item),
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
			description:
				"Read the quote library, newest first. Each quote includes its Chicago-style citation, built from attribution, sourceTitle, and sourceUrl.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({}),
		},
		() =>
			textResult(
				loadQuotes(client).map((quote) => ({
					...quote,
					citation: formatQuoteCitation(quote),
				})),
			),
	);
	server.registerTool(
		"save_quote",
		{
			description:
				"Add a quote, or edit one by passing its id. When editing, only the fields you pass change; pass an empty string to clear a field. attribution is the author, sourceTitle the book or article, sourceUrl an http(s) link, and sourceNote any context. Quotes that share a sourceUrl are grouped together in the app.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				id: z.number().int().positive().optional(),
				text: z.string().optional(),
				attribution: z.string().optional(),
				sourceTitle: z.string().optional(),
				sourceUrl: z.string().optional(),
				sourceNote: z.string().optional(),
			}),
		},
		({ id, ...changes }) => {
			const existing = id
				? loadQuotes(client).find((quote) => quote.id === id)
				: undefined;
			if (id && !existing)
				return { isError: true, ...textResult("Quote not found.") };

			const fields = quoteFieldsSchema.safeParse({
				text: changes.text ?? existing?.text ?? "",
				attribution: changes.attribution ?? existing?.attribution ?? "",
				sourceTitle: changes.sourceTitle ?? existing?.sourceTitle ?? "",
				sourceUrl: changes.sourceUrl ?? existing?.sourceUrl ?? "",
				sourceNote: changes.sourceNote ?? existing?.sourceNote ?? "",
			});
			if (!fields.success)
				return {
					isError: true,
					...textResult(fields.error.issues.map((issue) => issue.message)),
				};

			const quote = id
				? updateQuote(client, id, quoteInput(fields.data))
				: createQuote(client, quoteInput(fields.data));
			return textResult({ ...quote, citation: formatQuoteCitation(quote) });
		},
	);
	server.registerTool(
		"delete_quote",
		{
			description: "Permanently delete a quote from the library.",
			annotations: { readOnlyHint: false, destructiveHint: true },
			inputSchema: z.object({ id: z.number().int().positive() }),
		},
		({ id }) => {
			if (!loadQuotes(client).some((quote) => quote.id === id))
				return { isError: true, ...textResult("Quote not found.") };
			deleteQuote(client, id);
			return textResult({ ok: true });
		},
	);
	server.registerTool(
		"list_flashcard_decks",
		{
			description:
				"Read the Study page's decks: system-design terms, architecture patterns, and algorithm paths. These are built into the app; study progress is kept only in the browser.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({}),
		},
		async () => {
			const { systemTerms, architecturePatterns, algorithmPaths } =
				await Effect.runPromise(getFlashcardDecks());
			return textResult({ systemTerms, architecturePatterns, algorithmPaths });
		},
	);
	server.registerTool(
		"edit_personal",
		{
			description:
				"Create, rename, reorder, or delete Kindle chapters; assign highlights; or save personal book/chapter synopses and highlight commentary. Never edits Kindle-synced text. For save actions and deleteChapter, previous is the exact current synopsis or commentary (Lexical JSON) or null; read the book first so newer edits are not overwritten. Deleting a chapter unassigns its highlights. Supported actions: createChapter, renameChapter, moveChapter, deleteChapter, assignChapter, saveBook, saveChapter, saveCommentary.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				action: z.enum([
					"createChapter",
					"renameChapter",
					"moveChapter",
					"deleteChapter",
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
	registerWritingTools(server, client);
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
