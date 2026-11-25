import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSignedIn } from "./signed-in";
import {
	createProject as addProject,
	createProjectNote as addProjectNote,
	setWritingProject as attachWriting,
	renameProject as editProject,
	getProject as readProject,
	listProjectNotes as readProjectNotes,
	listProjects as readProjects,
	shareProjectNote as shareNote,
} from "./writing-projects";

const id = z.number().int().positive();
const title = z.string().trim().min(1).max(300);

export const listProjects = createServerFn({ method: "GET" }).handler(() =>
	runSignedIn(readProjects),
);

export const createProject = createServerFn({ method: "POST" })
	.validator((input: unknown) => z.object({ title }).parse(input))
	.handler(({ data }) => runSignedIn((db) => addProject(db, data.title)));

export const renameProject = createServerFn({ method: "POST" })
	.validator((input: unknown) => z.object({ id, title }).parse(input))
	.handler(({ data }) =>
		runSignedIn((db) => editProject(db, data.id, data.title)),
	);

export const getProject = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => readProject(db, data.id)));

export const setWritingProject = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z.object({ writingId: id, projectId: id.nullable() }).parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => attachWriting(db, data.writingId, data.projectId)),
	);

export const listProjectNotes = createServerFn({ method: "GET" })
	.validator((input: unknown) =>
		z
			.object({ projectId: id, query: z.string().max(300).optional() })
			.parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => readProjectNotes(db, data.projectId, data.query)),
	);

export const createProjectNote = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({
				projectId: id,
				title: z.string().trim().max(300),
				parentId: id.optional(),
			})
			.parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) =>
			addProjectNote(db, data.projectId, data.title, data.parentId),
		),
	);

export const shareProjectNote = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({ noteId: id, includeSubnotes: z.boolean().default(false) })
			.parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => shareNote(db, data.noteId, data.includeSubnotes)),
	);
