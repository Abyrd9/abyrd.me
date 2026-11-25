import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { initializeDatabase } from "./database/service";
import { handleKindleMcp } from "./kindle-mcp";
import { loadChapter } from "./writings";

const TOKEN = "test-only-token-at-least-32-characters";

test("agents manage writings, chapters, and notes through MCP", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-writing-mcp-"));
	const oldPath = process.env.APP_DATABASE_PATH;
	const oldToken = process.env.APP_MCP_TOKEN;
	process.env.APP_DATABASE_PATH = join(directory, "test.sqlite");
	process.env.APP_MCP_TOKEN = TOKEN;
	try {
		const db = (await Effect.runPromise(initializeDatabase.pipe(Effect.orDie)))
			.client;
		const call = async (name: string, args: unknown) => {
			const response = await handleKindleMcp(
				new Request("http://localhost:3001/api/mcp", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						accept: "application/json, text/event-stream",
						authorization: `Bearer ${TOKEN}`,
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "tools/call",
						params: { name, arguments: args },
					}),
				}),
			);
			const body = await response.json();
			const result = body.result;
			return {
				isError: Boolean(result.isError),
				value: JSON.parse(result.content[0].text),
			};
		};

		const created = await call("create_writing", {
			title: "The Salt Road",
			firstChapterTitle: "Arrival",
			firstChapterMarkdown: "The ferry left at *six*.",
		});
		const { id: writingId, firstChapterId } = created.value;
		expect(
			(await call("read_chapter", { chapterId: firstChapterId })).value,
		).toMatchObject({
			title: "Arrival",
			markdown: "The ferry left at *six*.",
			wordCount: 5,
		});

		// Existing chapter text changes only through suggestions.
		const refused = await call("update_chapter", {
			chapterId: firstChapterId,
			markdown: "Rewritten.",
		});
		expect(refused.isError).toBe(true);
		expect(loadChapter(db, firstChapterId)?.wordCount).toBe(5);

		// A new chapter at the front, then written while empty.
		const second = await call("create_chapter", {
			writingId,
			title: "Before",
			position: 0,
		});
		expect(second.value.position).toBe(0);
		expect(
			(
				await call("update_chapter", {
					chapterId: second.value.id,
					markdown: "## Prologue\n\nFog.",
				})
			).isError,
		).toBe(false);

		const parent = await call("create_note", {
			writingId,
			title: "Characters",
			markdown: "Everyone on the ferry.",
		});
		const child = await call("create_note", {
			writingId,
			title: "Mara",
			parentId: parent.value.id,
		});
		await call("update_note", {
			noteId: parent.value.id,
			markdown: "Plus the captain.",
			mode: "append",
		});
		expect(
			(await call("read_note", { noteId: parent.value.id })).value.markdown,
		).toBe("Everyone on the ferry.\n\nPlus the captain.");

		// Moving the parent under its own child is refused with a reason.
		const loop = await call("move_note", {
			noteId: parent.value.id,
			parentId: child.value.id,
		});
		expect(loop).toEqual({
			isError: true,
			value: "A note can't move inside itself.",
		});
		await call("move_note", {
			noteId: parent.value.id,
			chapterId: firstChapterId,
		});

		const outline = (await call("read_writing", { writingId })).value;
		expect(outline.chapters.map((c: { title: string }) => c.title)).toEqual([
			"Before",
			"Arrival",
		]);
		expect(
			outline.notes.map((n: { title: string; chapterId: number }) => [
				n.title,
				n.chapterId,
			]),
		).toEqual([
			["Characters", firstChapterId],
			["Mara", firstChapterId],
		]);

		// Deleting the chapter trashes its notes too, and restore brings all back.
		const trashed = await call("move_to_trash", {
			kind: "chapter",
			id: firstChapterId,
		});
		expect((await call("read_writing", { writingId })).value.notes).toEqual([]);
		expect(
			(await call("move_to_trash", { kind: "chapter", id: second.value.id }))
				.isError,
		).toBe(true);
		await call("restore_from_trash", { trashId: trashed.value.trashId });
		const restored = (await call("read_writing", { writingId })).value;
		expect(restored.chapters).toHaveLength(2);
		expect(restored.notes).toHaveLength(2);
		expect((await call("list_trash", {})).value).toEqual([]);
	} finally {
		if (oldPath === undefined) delete process.env.APP_DATABASE_PATH;
		else process.env.APP_DATABASE_PATH = oldPath;
		if (oldToken === undefined) delete process.env.APP_MCP_TOKEN;
		else process.env.APP_MCP_TOKEN = oldToken;
		rmSync(directory, { force: true, recursive: true });
	}
});
