// MCP tools for the writing app: writings, chapters, notes, and the trash.
// Text goes in and out as Markdown. Agents write chapter text only into
// chapters that are still empty; existing chapter text changes through
// suggestions the writer accepts or declines.
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { pageSizeIds } from "#/writing-page-sizes";
import type { AppDatabaseClient } from "./database/service";
import {
	contentWordCount,
	fromMarkdown,
	isEmptyContent,
	toMarkdown,
} from "./writing-markdown";
import {
	createNote,
	listNotes,
	loadNote,
	moveNote,
	NotePlacementError,
	reorderNote,
	searchNotes,
	updateNote,
} from "./writing-notes";
import {
	listTrash,
	restoreTrashItem,
	TrashError,
	trashChapter,
	trashNote,
	trashWriting,
} from "./writing-trash";
import {
	createChapter,
	createWriting,
	listWritings,
	loadChapter,
	loadWriting,
	moveChapter,
	updateChapter,
	updateWriting,
} from "./writings";

const json = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const fail = (message: string) => ({ isError: true, ...json(message) });

const id = z.number().int().positive();
const title = z.string().trim().max(300);
const markdown = z.string().max(2_000_000);

/** Runs a tool, turning the app's known refusals into readable tool errors. */
const guarded =
	<Input>(
		run: (input: Input) => ReturnType<typeof json> | ReturnType<typeof fail>,
	) =>
	(input: Input) => {
		try {
			return run(input);
		} catch (error) {
			if (error instanceof NotePlacementError) return fail(error.message);
			if (error instanceof TrashError)
				return fail(
					error.reason === "last-chapter"
						? "A writing needs at least one chapter, so its only chapter can't be deleted."
						: error.reason === "writing-gone"
							? "The writing this belonged to is gone. Restore the writing first."
							: "Something with the same id already exists, so this can't be restored.",
				);
			throw error;
		}
	};

const chapterSummary = (chapter: {
	id: number;
	title: string;
	position: number;
	wordCount: number;
	updatedAt: number;
}) => ({
	id: chapter.id,
	title: chapter.title,
	position: chapter.position,
	wordCount: chapter.wordCount,
	updatedAt: chapter.updatedAt,
});

/** Moves a chapter one step at a time until it sits at the position asked for. */
const placeChapter = (db: AppDatabaseClient, chapterId: number, to: number) => {
	for (let step = 0; step < 1000; step++) {
		const chapter = loadChapter(db, chapterId);
		if (!chapter || chapter.position === to) return;
		const moved = moveChapter(
			db,
			chapterId,
			chapter.position > to ? "earlier" : "later",
		);
		if (!moved) return;
	}
};

/** Moves a note among its siblings until it sits at the position asked for. */
const placeNote = (db: AppDatabaseClient, noteId: number, to: number) => {
	for (let step = 0; step < 1000; step++) {
		const note = loadNote(db, noteId);
		if (!note || note.position === to) return;
		const moved = reorderNote(
			db,
			noteId,
			note.position > to ? "earlier" : "later",
		);
		if (!moved) return;
	}
};

export const registerWritingTools = (
	server: McpServer,
	db: AppDatabaseClient,
) => {
	server.registerTool(
		"list_writings",
		{
			description:
				"List the writer's writings (books, essays), newest edit first, with chapter and word counts.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({}),
		},
		() =>
			json(
				listWritings(db).map(
					({ id, title, pageSize, chapterCount, wordCount, updatedAt }) => ({
						id,
						title,
						pageSize,
						chapterCount,
						wordCount,
						updatedAt,
					}),
				),
			),
	);

	server.registerTool(
		"read_writing",
		{
			description:
				"Outline of one writing: its chapters in order (without text) and every note. Notes belong to a chapter (chapterId) or the whole book (chapterId null), and nest under parentId; position orders siblings. Read text with read_chapter and read_note.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({ writingId: id }),
		},
		({ writingId }) => {
			const writing = loadWriting(db, writingId);
			if (!writing) return fail("Writing not found.");
			return json({
				id: writing.id,
				title: writing.title,
				pageSize: writing.pageSize,
				chapters: writing.chapters.map(chapterSummary),
				notes: listNotes(db, writingId),
			});
		},
	);

	server.registerTool(
		"read_chapter",
		{
			description:
				"A chapter's text as Markdown. Besides standard Markdown: ==highlight==, <u>underline</u>, <sup>superscript</sup>, ^[footnote text], > [!epigraph] / > [!verse] / > [!callout] blocks, *** for a scene break, and <!-- page break -->.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({ chapterId: id }),
		},
		({ chapterId }) => {
			const chapter = loadChapter(db, chapterId);
			if (!chapter) return fail("Chapter not found.");
			return json({
				...chapterSummary(chapter),
				writingId: chapter.writingId,
				markdown: toMarkdown(chapter.content),
			});
		},
	);

	server.registerTool(
		"read_note",
		{
			description:
				"A note's text as Markdown (same syntax as read_chapter), with where it sits and what links to it.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({ noteId: id }),
		},
		({ noteId }) => {
			const note = loadNote(db, noteId);
			if (!note) return fail("Note not found.");
			const { content, revision, ...rest } = note;
			return json({ ...rest, markdown: toMarkdown(content) });
		},
	);

	server.registerTool(
		"search_notes",
		{
			description:
				"Find notes by title across all writings. Notes in writingId, when given, come first.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({
				query: z.string().trim().min(1).max(200),
				writingId: id.optional(),
			}),
		},
		({ query, writingId }) => json(searchNotes(db, query, writingId ?? 0)),
	);

	server.registerTool(
		"create_writing",
		{
			description:
				"Start a new writing with one chapter. Optionally give the first chapter a title and Markdown text.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				title: title.min(1),
				pageSize: z.enum(pageSizeIds).optional(),
				firstChapterTitle: title.optional(),
				firstChapterMarkdown: markdown.optional(),
			}),
		},
		({ title, pageSize, firstChapterTitle, firstChapterMarkdown }) => {
			const writing = createWriting(db, title);
			if (pageSize) updateWriting(db, writing.id, { pageSize });
			if (firstChapterTitle !== undefined || firstChapterMarkdown) {
				const content = firstChapterMarkdown
					? fromMarkdown(firstChapterMarkdown)
					: undefined;
				updateChapter(db, writing.firstChapterId, {
					title: firstChapterTitle,
					content,
					wordCount: content ? contentWordCount(content) : undefined,
				});
			}
			return json({ id: writing.id, firstChapterId: writing.firstChapterId });
		},
	);

	server.registerTool(
		"update_writing",
		{
			description: "Rename a writing or change its page size.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				writingId: id,
				title: title.min(1).optional(),
				pageSize: z.enum(pageSizeIds).optional(),
			}),
		},
		({ writingId, title, pageSize }) => {
			if (!loadWriting(db, writingId)) return fail("Writing not found.");
			updateWriting(db, writingId, { title, pageSize });
			return json({ ok: true });
		},
	);

	server.registerTool(
		"create_chapter",
		{
			description:
				"Add a chapter to a writing, at the end or at position (0 is first), optionally with a title and Markdown text.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				writingId: id,
				title: title.optional(),
				markdown: markdown.optional(),
				position: z.number().int().min(0).optional(),
			}),
		},
		({ writingId, title, markdown, position }) => {
			if (!loadWriting(db, writingId)) return fail("Writing not found.");
			const chapter = createChapter(db, writingId);
			const content = markdown ? fromMarkdown(markdown) : undefined;
			if (title !== undefined || content)
				updateChapter(db, chapter.id, {
					title,
					content,
					wordCount: content ? contentWordCount(content) : undefined,
				});
			if (position !== undefined) placeChapter(db, chapter.id, position);
			const placed = loadChapter(db, chapter.id);
			return json({ id: chapter.id, position: placed?.position });
		},
	);

	server.registerTool(
		"update_chapter",
		{
			description:
				"Rename a chapter, move it to another position (0 is first), or write its text. Text can only be written while the chapter is empty; to change existing chapter text, suggest edits for the writer to accept instead.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				chapterId: id,
				title: title.optional(),
				position: z.number().int().min(0).optional(),
				markdown: markdown.optional(),
			}),
		},
		({ chapterId, title, position, markdown }) => {
			const chapter = loadChapter(db, chapterId);
			if (!chapter) return fail("Chapter not found.");
			if (markdown !== undefined && !isEmptyContent(chapter.content))
				return fail(
					"This chapter already has text, which only the writer changes directly. Suggest edits instead.",
				);
			const content =
				markdown !== undefined ? fromMarkdown(markdown) : undefined;
			if (title !== undefined || content !== undefined)
				updateChapter(db, chapterId, {
					title,
					content,
					wordCount:
						content !== undefined ? contentWordCount(content) : undefined,
					// Refuses if the writer typed into it since it was read above.
					baseRevision: content !== undefined ? chapter.revision : undefined,
				});
			if (position !== undefined) placeChapter(db, chapterId, position);
			return json({ ok: true });
		},
	);

	server.registerTool(
		"create_note",
		{
			description:
				"Add a note to a writing. Give chapterId to tie it to a chapter (omit for the whole book) and parentId to nest it under another note; a child always shares its parent's chapter. markdown is the note's text.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				writingId: id,
				title,
				markdown: markdown.optional(),
				chapterId: id.nullable().optional(),
				parentId: id.nullable().optional(),
			}),
		},
		guarded(({ writingId, title, markdown, chapterId, parentId }) => {
			const note = createNote(db, { writingId, title, chapterId, parentId });
			if (markdown)
				updateNote(db, note.id, { content: fromMarkdown(markdown) });
			return json({ id: note.id });
		}),
	);

	server.registerTool(
		"update_note",
		{
			description:
				'Rename a note or change its text. mode "replace" (default) swaps the whole text for markdown; "append" adds markdown after the existing text. To move a note, use move_note.',
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				noteId: id,
				title: title.optional(),
				markdown: markdown.optional(),
				mode: z.enum(["replace", "append"]).optional(),
			}),
		},
		({ noteId, title, markdown, mode }) => {
			const note = loadNote(db, noteId);
			if (!note) return fail("Note not found.");
			const text =
				markdown === undefined
					? undefined
					: mode === "append" && !isEmptyContent(note.content)
						? `${toMarkdown(note.content)}\n\n${markdown}`
						: markdown;
			const result = updateNote(db, noteId, {
				title,
				content: text !== undefined ? fromMarkdown(text) : undefined,
				// Refuses if the writer typed into it since it was read above.
				baseRevision: text !== undefined ? note.revision : undefined,
			});
			if (result?.conflict)
				return fail(
					"The writer just changed this note. Read it again and retry.",
				);
			return json({ ok: true });
		},
	);

	server.registerTool(
		"move_note",
		{
			description:
				"Move a note, with everything beneath it, within its writing: to a chapter (chapterId) or the whole book (chapterId null), under another note (parentId) or the top level (parentId null), and optionally to position among its new siblings (0 is first). Omitted placement fields keep the note where it is.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({
				noteId: id,
				chapterId: id.nullable().optional(),
				parentId: id.nullable().optional(),
				position: z.number().int().min(0).optional(),
			}),
		},
		guarded(({ noteId, chapterId, parentId, position }) => {
			const note = loadNote(db, noteId);
			if (!note) return fail("Note not found.");
			if (chapterId !== undefined || parentId !== undefined)
				moveNote(db, noteId, {
					chapterId: chapterId === undefined ? note.chapterId : chapterId,
					parentId: parentId === undefined ? note.parentId : parentId,
				});
			if (position !== undefined) placeNote(db, noteId, position);
			return json({ ok: true });
		}),
	);

	server.registerTool(
		"move_to_trash",
		{
			description:
				"Delete a writing, chapter, or note by moving it to the Trash, with everything inside it (a chapter's notes, a note's sub-notes). The writer can restore it for 30 days. A writing's only chapter can't be deleted.",
			annotations: { readOnlyHint: false, destructiveHint: true },
			inputSchema: z.object({
				kind: z.enum(["writing", "chapter", "note"]),
				id,
			}),
		},
		guarded(({ kind, id }) => {
			const item =
				kind === "writing"
					? trashWriting(db, id)
					: kind === "chapter"
						? trashChapter(db, id)
						: trashNote(db, id);
			if (!item) return fail(`That ${kind} wasn't found.`);
			return json({ trashId: item.id });
		}),
	);

	server.registerTool(
		"list_trash",
		{
			description:
				"What's in the Trash, newest first. Items are deleted for good after 30 days.",
			annotations: { readOnlyHint: true },
			inputSchema: z.object({}),
		},
		() => json(listTrash(db)),
	);

	server.registerTool(
		"restore_from_trash",
		{
			description:
				"Put a trashed writing, chapter, or note back. A chapter returns to its old position; a note whose chapter or parent is gone returns to the whole book or the top level.",
			annotations: { readOnlyHint: false },
			inputSchema: z.object({ trashId: id }),
		},
		guarded(({ trashId }) => {
			const restored = restoreTrashItem(db, trashId);
			if (!restored) return fail("That item isn't in the Trash.");
			return json(restored);
		}),
	);
};
