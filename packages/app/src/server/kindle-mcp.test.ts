import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { initializeDatabase } from "./database/service";
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
