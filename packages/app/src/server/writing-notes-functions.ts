import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSignedIn } from "./signed-in";
import {
	createNote,
	deleteNote,
	keepUnsavedEdits,
	listNotes,
	loadNote,
	moveNote,
	reorderNote,
	searchNotes,
	updateNote,
} from "./writing-notes";

const id = z.number().int().positive();
const optionalId = id.nullable();
const title = z.string().trim().max(300);

export const listWritingNotes = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ writingId: id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => listNotes(db, data.writingId)));

export const loadWritingNote = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => loadNote(db, data.id)));

export const createWritingNote = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({
				writingId: optionalId,
				projectId: optionalId.optional(),
				chapterId: optionalId.optional(),
				parentId: optionalId.optional(),
				title,
			})
			.parse(input),
	)
	.handler(({ data }) => runSignedIn((db) => createNote(db, data)));

export const updateWritingNote = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({
				id,
				title: title.optional(),
				// Matches the chapter limit; notes are usually far smaller.
				content: z.string().max(10_000_000).optional(),
				/** The text version the editor started from; see contentRevision. */
				baseRevision: z.string().max(64).optional(),
			})
			.parse(input),
	)
	.handler(({ data: { id, ...changes } }) =>
		runSignedIn((db) => {
			const result = updateNote(db, id, changes);
			if (!result?.conflict || changes.content === undefined) return result;
			const keptNoteId = keepUnsavedEdits(db, result, changes.content);
			return { ...result, keptNoteId };
		}),
	);

export const moveWritingNote = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z.object({ id, chapterId: optionalId, parentId: optionalId }).parse(input),
	)
	.handler(({ data: { id, ...to } }) =>
		runSignedIn((db) => moveNote(db, id, to)),
	);

export const reorderWritingNote = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z.object({ id, direction: z.enum(["earlier", "later"]) }).parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => reorderNote(db, data.id, data.direction)),
	);

export const deleteWritingNote = createServerFn({ method: "POST" })
	.validator((input: unknown) => z.object({ id }).parse(input))
	.handler(({ data }) => runSignedIn((db) => deleteNote(db, data.id)));

export const searchWritingNotes = createServerFn({ method: "GET" })
	.validator((input: unknown) =>
		z.object({ query: z.string().max(300), currentWritingId: id }).parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => searchNotes(db, data.query, data.currentWritingId)),
	);
