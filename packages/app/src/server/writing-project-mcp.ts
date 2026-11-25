import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppDatabaseClient } from "./database/service";
import { fromMarkdown } from "./writing-markdown";
import { NotePlacementError, updateNote } from "./writing-notes";
import {
	createProject,
	createProjectNote,
	getProject,
	listProjectNotes,
	listProjects,
	renameProject,
	setWritingProject,
	shareProjectNote,
} from "./writing-projects";
import { loadWriting } from "./writings";

const json = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const fail = (message: string) => ({ isError: true, ...json(message) });
const id = z.number().int().positive();
const title = z.string().trim().min(1).max(300);

const guarded =
	<Input>(run: (input: Input) => ReturnType<typeof json>) =>
	(input: Input) => {
		try {
			return run(input);
		} catch (error) {
			if (error instanceof NotePlacementError) return fail(error.message);
			throw error;
		}
	};

export const registerProjectTools = (
	server: McpServer,
	db: AppDatabaseClient,
) => {
	server.registerTool(
		"list_projects",
		{
			description:
				"List writing projects. Supply query to find projects by title, case-insensitively.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({
				query: z.string().trim().min(1).max(200).optional(),
			}),
		},
		({ query }) =>
			json(
				listProjects(db).filter(
					(project) =>
						!query || project.title.toLowerCase().includes(query.toLowerCase()),
				),
			),
	);

	server.registerTool(
		"create_project",
		{
			description:
				"Create a project for related writings and shared wiki notes.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({ title }),
		},
		({ title }) => json(createProject(db, title)),
	);

	server.registerTool(
		"rename_project",
		{
			description: "Rename an existing writing project.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({ projectId: id, title }),
		},
		({ projectId, title }) => {
			if (!getProject(db, projectId)) return fail("Project not found.");
			renameProject(db, projectId, title);
			return json({ ok: true });
		},
	);

	server.registerTool(
		"read_project",
		{
			description:
				"Read a project and list its member writings. Use list_project_notes for its wiki and read_writing for a member's outline.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({ projectId: id }),
		},
		({ projectId }) => {
			const project = getProject(db, projectId);
			return project ? json(project) : fail("Project not found.");
		},
	);

	server.registerTool(
		"set_writing_project",
		{
			description:
				"Attach a writing to a project, or detach it with projectId null. A writing belongs to at most one project; attaching it replaces its previous membership. This does not share its private notes.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({ writingId: id, projectId: id.nullable() }),
		},
		guarded(({ writingId, projectId }) => {
			if (!loadWriting(db, writingId)) return fail("Writing not found.");
			if (projectId !== null && !getProject(db, projectId))
				return fail("Project not found.");
			setWritingProject(db, writingId, projectId);
			return json({ ok: true });
		}),
	);

	server.registerTool(
		"list_project_notes",
		{
			description:
				"List a project's wiki notes, or search their titles and text. Results include note ids, titles, hierarchy, and writing/chapter attachments. Use read_note to read text and update_note to edit it.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({
				projectId: id,
				query: z.string().trim().min(1).max(200).optional(),
			}),
		},
		({ projectId, query }) => {
			if (!getProject(db, projectId)) return fail("Project not found.");
			return json(listProjectNotes(db, projectId, query));
		},
	);

	server.registerTool(
		"create_project_note",
		{
			description:
				"Create a project wiki note, optionally nested under another wiki note. markdown supplies its text. Use read_note and update_note to read or edit it later.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				projectId: id,
				title,
				parentId: id.optional(),
				markdown: z.string().max(2_000_000).optional(),
			}),
		},
		guarded(({ projectId, title, parentId, markdown }) => {
			if (!getProject(db, projectId)) return fail("Project not found.");
			const note = createProjectNote(db, projectId, title, parentId);
			if (markdown !== undefined)
				updateNote(db, note.id, { content: fromMarkdown(markdown) });
			return json({ id: note.id });
		}),
	);

	server.registerTool(
		"share_project_note",
		{
			description:
				"Share an existing writing note in its writing's project wiki, keeping the same note and text. The writing must belong to a project. Only this note is shared by default; set includeSubnotes true to explicitly share its whole subtree. Sharing is project-internal, not public publishing.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				noteId: id,
				includeSubnotes: z.boolean().default(false),
			}),
		},
		guarded(({ noteId, includeSubnotes }) =>
			json(shareProjectNote(db, noteId, includeSubnotes)),
		),
	);
};
