import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { type AppDatabaseClient, initializeDatabase } from "./database/service";
import { importKindleBooks, loadKindleLibrary } from "./kindle";
import { handleKindleMcp } from "./kindle-mcp";

test("MCP requires the private token and restricts writes to personal fields", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-mcp-"));
	const oldPath = process.env.APP_DATABASE_PATH;
	const oldToken = process.env.APP_MCP_TOKEN;
	const oldMode = process.env.NODE_ENV;
	process.env.APP_DATABASE_PATH = join(directory, "test.sqlite");
	process.env.APP_MCP_TOKEN = "test-only-token-at-least-32-characters";
	try {
		const db = await Effect.runPromise(initializeDatabase.pipe(Effect.orDie));
		importKindleBooks(db.client, {
			books: [
				{
					asin: "test-book",
					title: "Test book",
					author: "Author",
					lastAnnotatedAt: "",
					annotations: [{ highlight: "Original highlight" }],
				},
			],
			errors: [],
		});
		const request = (body: unknown, token?: string, origin?: string) =>
			new Request("http://localhost:3001/api/mcp", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					...(token ? { authorization: `Bearer ${token}` } : {}),
					...(origin ? { origin } : {}),
				},
				body: JSON.stringify(body),
			});
		const message = (name: string, args: unknown) => ({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: { name, arguments: args },
		});
		delete process.env.APP_MCP_TOKEN;
		process.env.NODE_ENV = "production";
		expect(
			(
				await handleKindleMcp(
					request(
						message("list_books", {}),
						"test-only-token-at-least-32-characters",
					),
				)
			).status,
		).toBe(401);
		if (oldMode === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = oldMode;
		process.env.APP_MCP_TOKEN = "test-only-token-at-least-32-characters";
		expect(
			(await handleKindleMcp(request(message("list_books", {})))).status,
		).toBe(401);
		expect(
			(await handleKindleMcp(request(message("list_books", {}), "wrong-token")))
				.status,
		).toBe(401);
		expect(
			(
				await handleKindleMcp(
					request(
						message("list_books", {}),
						process.env.APP_MCP_TOKEN,
						"https://untrusted.example",
					),
				)
			).status,
		).toBe(403);
		const created = await handleKindleMcp(
			request(
				message("edit_personal", {
					action: "createChapter",
					asin: "test-book",
					title: "Chapter",
				}),
				process.env.APP_MCP_TOKEN,
			),
		);
		expect(created.status).toBe(200);
		expect(loadKindleLibrary(db.client).chapters[0]?.title).toBe("Chapter");
		const refused = await handleKindleMcp(
			request(
				message("edit_personal", {
					action: "updateHighlight",
					id: 1,
					highlight: "Changed",
				}),
				process.env.APP_MCP_TOKEN,
			),
		);
		expect(JSON.stringify(await refused.json())).toContain('"isError":true');
		expect(loadKindleLibrary(db.client).annotations[0]?.highlight).toBe(
			"Original highlight",
		);
		const missing = await handleKindleMcp(
			request(
				message("set_archive", {
					kind: "book",
					asin: "missing",
					archived: true,
				}),
				process.env.APP_MCP_TOKEN,
			),
		);
		expect(JSON.stringify(await missing.json())).toContain('"isError":true');
		// The app keeps one database connection per process, so the remaining
		// tool checks run here, before this test closes it.
		await checkQuoteAndParityTools(db.client);
		db.client.$client.close(false);
	} finally {
		if (oldPath === undefined) delete process.env.APP_DATABASE_PATH;
		else process.env.APP_DATABASE_PATH = oldPath;
		if (oldToken === undefined) delete process.env.APP_MCP_TOKEN;
		else process.env.APP_MCP_TOKEN = oldToken;
		if (oldMode === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = oldMode;
		rmSync(directory, { recursive: true, force: true });
	}
});

const checkQuoteAndParityTools = async (client: AppDatabaseClient) => {
	importKindleBooks(client, {
		books: [
			{
				asin: "firm",
				title: "The Nature of the Firm",
				author: "R. H. Coase",
				lastAnnotatedAt: "",
				annotations: [{ highlight: "Markets cost something.", location: "12" }],
			},
		],
		errors: [],
	});
	const call = async (name: string, args: unknown) => {
		const response = await handleKindleMcp(
			new Request("http://localhost:3001/api/mcp", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					authorization: `Bearer ${process.env.APP_MCP_TOKEN}`,
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "tools/call",
					params: { name, arguments: args },
				}),
			}),
		);
		const body: {
			result: { isError?: boolean; content: Array<{ text: string }> };
		} = await response.json();
		return {
			isError: body.result.isError === true,
			value: JSON.parse(body.result.content[0]?.text ?? "null"),
		};
	};

	const created = await call("save_quote", {
		text: "Knowledge of time and place.",
		attribution: "F. A. Hayek",
		sourceTitle: "The Use of Knowledge in Society",
	});
	expect(created.value.citation).toBe(
		"F. A. Hayek, The Use of Knowledge in Society.",
	);

	const edited = await call("save_quote", {
		id: created.value.id,
		sourceUrl: "https://www.econlib.org/library/Essays/hykKnw.html",
	});
	expect(edited.value).toMatchObject({
		text: "Knowledge of time and place.",
		attribution: "F. A. Hayek",
	});
	expect((await call("list_quotes", {})).value[0].citation).toBe(
		"F. A. Hayek, “The Use of Knowledge in Society,” https://www.econlib.org/library/Essays/hykKnw.html.",
	);

	expect((await call("save_quote", { text: " " })).isError).toBe(true);
	expect(
		(
			await call("save_quote", {
				text: "Hi",
				sourceUrl: "javascript:alert(1)",
			})
		).isError,
	).toBe(true);
	expect((await call("save_quote", { id: 999, text: "Hi" })).isError).toBe(
		true,
	);

	expect((await call("delete_quote", { id: created.value.id })).isError).toBe(
		false,
	);
	expect((await call("list_quotes", {})).value).toEqual([]);
	expect((await call("delete_quote", { id: created.value.id })).isError).toBe(
		true,
	);

	const book = await call("read_book", { asin: "firm" });
	expect(book.value.activeHighlights[0].citation).toBe(
		"R. H. Coase, The Nature of the Firm (Kindle edition), loc. 12.",
	);

	await call("edit_personal", {
		action: "createChapter",
		asin: "firm",
		title: "One",
	});
	const chapterId = loadKindleLibrary(client).chapters.find(
		(chapter) => chapter.title === "One",
	)?.id;
	const deleted = await call("edit_personal", {
		action: "deleteChapter",
		id: chapterId,
		previous: null,
	});
	expect(deleted.isError).toBe(false);
	expect(
		loadKindleLibrary(client).chapters.some(
			(chapter) => chapter.id === chapterId,
		),
	).toBe(false);

	const decks = await call("list_flashcard_decks", {});
	expect(decks.value.systemTerms.length).toBeGreaterThan(0);
	expect(decks.value.studyVisuals).toBeUndefined();
};
