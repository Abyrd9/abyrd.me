import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { initializeDatabase } from "./database/service";
import { handleKindleMcp } from "./kindle-mcp";

const TOKEN = "test-only-token-at-least-32-characters";

test("project MCP manages membership and wiki notes without sharing private descendants by default", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-project-mcp-"));
	const oldPath = process.env.APP_DATABASE_PATH;
	const oldToken = process.env.APP_MCP_TOKEN;
	process.env.APP_DATABASE_PATH = join(directory, "test.sqlite");
	process.env.APP_MCP_TOKEN = TOKEN;
	try {
		await Effect.runPromise(initializeDatabase.pipe(Effect.orDie));
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
			expect(body.error).toBeUndefined();
			const result = body.result;
			return {
				isError: Boolean(result.isError),
				value: JSON.parse(result.content[0].text),
			};
		};

		const project = await call("create_project", { title: "Salt Road" });
		expect(project.isError).toBe(false);
		const projectId = project.value.id;
		await call("rename_project", { projectId, title: "Coastal stories" });
		expect(
			(await call("list_projects", { query: "COASTAL" })).value,
		).toMatchObject([{ id: projectId, title: "Coastal stories" }]);
		expect((await call("list_projects", { query: "absent" })).value).toEqual(
			[],
		);

		const writing = await call("create_writing", { title: "The ferry" });
		const writingId = writing.value.id;
		await call("set_writing_project", { writingId, projectId });
		expect(
			(await call("read_project", { projectId })).value.writings,
		).toMatchObject([{ id: writingId, title: "The ferry" }]);

		const parent = await call("create_note", {
			writingId,
			title: "Characters",
		});
		const child = await call("create_note", {
			writingId,
			title: "Private backstory",
			parentId: parent.value.id,
		});
		await call("share_project_note", { noteId: parent.value.id });
		const shared = (await call("list_project_notes", { projectId })).value;
		expect(shared.map((note: { id: number }) => note.id)).toEqual([
			parent.value.id,
		]);
		await call("share_project_note", {
			noteId: parent.value.id,
			includeSubnotes: true,
		});
		expect(
			(await call("list_project_notes", { projectId, query: "backstory" }))
				.value,
		).toMatchObject([{ id: child.value.id, parentId: parent.value.id }]);

		const wiki = await call("create_project_note", {
			projectId,
			title: "Locations",
			markdown: "The **harbor**.",
		});
		expect(wiki.isError).toBe(false);
		expect(
			(await call("list_project_notes", { projectId, query: "harbor" })).value,
		).toMatchObject([{ id: wiki.value.id, writingId: null }]);
		const nested = await call("create_project_note", {
			projectId,
			title: "Pier",
			parentId: wiki.value.id,
		});
		expect(
			(await call("list_project_notes", { projectId, query: "Pier" })).value,
		).toMatchObject([{ id: nested.value.id, parentId: wiki.value.id }]);
		const beforeEdit = (await call("read_note", { noteId: wiki.value.id }))
			.value;
		await call("update_note", {
			noteId: wiki.value.id,
			markdown: "The ferry dock.",
			mode: "append",
			baseRevision: beforeEdit.revision,
		});
		expect(
			(
				await call("update_note", {
					noteId: wiki.value.id,
					markdown: "Stale replacement",
					baseRevision: beforeEdit.revision,
				})
			).isError,
		).toBe(true);
		expect(
			(await call("read_note", { noteId: wiki.value.id })).value.markdown,
		).toBe("The **harbor**.\n\nThe ferry dock.");

		await call("set_writing_project", { writingId, projectId: null });
		expect((await call("read_project", { projectId })).value.writings).toEqual(
			[],
		);
		expect(
			(await call("set_writing_project", { writingId, projectId: 999999 }))
				.isError,
		).toBe(true);
		expect((await call("read_project", { projectId: 999999 })).isError).toBe(
			true,
		);
		expect(
			(await call("list_project_notes", { projectId: 999999 })).isError,
		).toBe(true);
	} finally {
		if (oldPath === undefined) delete process.env.APP_DATABASE_PATH;
		else process.env.APP_DATABASE_PATH = oldPath;
		if (oldToken === undefined) delete process.env.APP_MCP_TOKEN;
		else process.env.APP_MCP_TOKEN = oldToken;
		rmSync(directory, { force: true, recursive: true });
	}
});
