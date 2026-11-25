import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pageSizeIds } from "#/writing-page-sizes";
import { runSignedIn } from "./signed-in";
import { keepUnsavedEdits } from "./writing-notes";
import {
	createChapter as addChapter,
	createWriting as addWriting,
	updateChapter as editChapter,
	updateWriting as editWriting,
	loadChapter as readChapter,
	loadRevisions as readRevisions,
	loadWriting as readWriting,
	listWritings as readWritings,
	deleteChapter as removeChapter,
	deleteWriting as removeWriting,
	moveChapter as reorderChapter,
} from "./writings";

const id = z.number().int().positive();
const title = z.string().trim().max(300);

export const listWritings = createServerFn({ method: "GET" }).handler(() =>
	runSignedIn(readWritings),
);

export const loadWriting = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => readWriting(db, data.id)));

export const createWriting = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z.object({ title: title.min(1, "Name your writing.") }).parse(input),
	)
	.handler(({ data }) => runSignedIn((db) => addWriting(db, data.title)));

export const updateWriting = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({
				id,
				title: title.min(1).optional(),
				pageSize: z.enum(pageSizeIds).optional(),
			})
			.parse(input),
	)
	.handler(({ data: { id, ...changes } }) =>
		runSignedIn((db) => editWriting(db, id, changes)),
	);

export const deleteWriting = createServerFn({ method: "POST" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) =>
		runSignedIn((db) => {
			removeWriting(db, data.id);
			return { ok: true as const };
		}),
	);

export const createChapter = createServerFn({ method: "POST" })
	.validator((input: unknown) => z.object({ writingId: id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => addChapter(db, data.writingId)));

export const updateChapter = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({
				id,
				title: title.optional(),
				// Lexical JSON for a long chapter stays well under this limit.
				content: z.string().max(10_000_000).optional(),
				wordCount: z.number().int().min(0).optional(),
				/** The text version the editor started from; see contentRevision. */
				baseRevision: z.string().max(64).optional(),
			})
			.parse(input),
	)
	.handler(({ data: { id, ...changes } }) =>
		runSignedIn((db) => {
			const result = editChapter(db, id, changes);
			if (!result?.conflict || changes.content === undefined) return result;
			const keptNoteId = keepUnsavedEdits(
				db,
				{
					writingId: result.writingId,
					chapterId: id,
					parentId: null,
					title: result.title || `Chapter ${result.position + 1}`,
				},
				changes.content,
			);
			return { ...result, keptNoteId };
		}),
	);

export const loadWritingRevisions = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ writingId: id }).parse(input))
	.handler(({ data }) =>
		runSignedIn((db) => readRevisions(db, data.writingId)),
	);

export const loadChapter = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => readChapter(db, data.id)));

export const deleteChapter = createServerFn({ method: "POST" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => removeChapter(db, data.id)));

export const moveChapter = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z.object({ id, direction: z.enum(["earlier", "later"]) }).parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => reorderChapter(db, data.id, data.direction)),
	);
