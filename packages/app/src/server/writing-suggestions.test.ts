import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { writingChapters } from "./database/schema";
import { createDatabase } from "./database/service";
import {
	chapterBlockTexts,
	createSuggestion,
	listSuggestions,
	resolveSuggestion,
	SuggestionError,
	withdrawSuggestion,
} from "./writing-suggestions";
import { createWriting, loadRevisions, updateChapter } from "./writings";

const text = (text: string) => ({ type: "text", text });
const block = (type: string, ...children: unknown[]) => ({ type, children });
const doc = (...children: unknown[]) => JSON.stringify({ root: { children } });
const paragraphs = (...texts: string[]) =>
	doc(...texts.map((value) => block("paragraph", text(value))));
const withDatabase = async (
	run: (db: Awaited<ReturnType<typeof open>>["client"]) => void,
) => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-suggestions-"));
	const database = await open(directory);
	try {
		run(database.client);
	} finally {
		database.client.$client.close(false);
		rmSync(directory, { force: true, recursive: true });
	}
};
const open = (directory: string) =>
	Effect.runPromise(
		createDatabase({
			databasePath: join(directory, "app.sqlite"),
			migrationsFolder: join(process.cwd(), "drizzle"),
		}),
	);

test("block texts match editor leaf blocks and ignore decorators and code", () => {
	expect(
		chapterBlockTexts(
			doc(
				block("heading", text("Title")),
				block(
					"paragraph",
					{ ...text("Bold"), format: 1 },
					block("link", text(" link")),
					{ type: "footnote", text: "hidden" },
					{ type: "wiki-link", title: "hidden" },
					{ type: "linebreak" },
					{ type: "tab", text: "\t" },
					text("end"),
				),
				block(
					"list",
					block(
						"listitem",
						text("ignored"),
						block("list", block("listitem", text("nested"))),
					),
					block("listitem", text("next")),
				),
				block("code", text("skip")),
				block("verse", text("line"), { type: "linebreak" }, text("two")),
				block("paragraph", text("  ")),
			),
		),
	).toEqual(["Title", "Bold link\n\tend", "nested", "next", "line\ntwo"]);
	expect(chapterBlockTexts(null)).toEqual([]);
	expect(chapterBlockTexts("bad json")).toEqual([]);
});

test("validates exact unique passages, bounds, and overlapping pending spans", () =>
	withDatabase((db) => {
		const { firstChapterId: chapterId } = createWriting(db, "Book");
		updateChapter(db, chapterId, {
			content: paragraphs(
				"The ferry left at six.",
				"Again again.",
				"Last paragraph.",
			),
		});
		const propose = (
			passage: string,
			alternatives = [{ text: "replacement" }],
		) => createSuggestion(db, { chapterId, passage, alternatives });
		expect(() =>
			createSuggestion(db, {
				chapterId: 999,
				passage: "x",
				alternatives: [{ text: "y" }],
			}),
		).toThrow("Chapter not found");
		for (const passage of ["", " ".repeat(2), "x".repeat(2001)])
			expect(() => propose(passage)).toThrow(SuggestionError);
		expect(() => propose("missing")).toThrow("Copy it exactly");
		expect(() => propose("again")).not.toThrow();
		expect(() => propose("a")).toThrow("appears");
		expect(() => propose("six.\nAgain")).toThrow("within one paragraph");
		expect(() => propose("ferry", [{ text: "ferry" }])).toThrow("differ");
		expect(() => propose("ferry", [])).toThrow("between 1 and 5");
		expect(() =>
			propose(
				"ferry",
				Array.from({ length: 6 }, () => ({ text: "x" })),
			),
		).toThrow("between 1 and 5");
		expect(() => propose("ferry", [{ text: "x".repeat(4001) }])).toThrow(
			"4000",
		);
		const suggestion = propose("ferry left");
		expect(suggestion.alternatives).toEqual([
			{ text: "replacement", reason: null },
		]);
		expect(() => propose("left at")).toThrow(`id ${suggestion.id}`);
		expect(() => propose("The ")).not.toThrow();
		expect(() => propose("Last", [{ text: "" }])).not.toThrow();
	}));

test("lists current matches and pending revisions, resolves once, and cascades deletes", () =>
	withDatabase((db) => {
		const { id: writingId, firstChapterId: chapterId } = createWriting(
			db,
			"Book",
		);
		updateChapter(db, chapterId, {
			title: "Arrival",
			content: paragraphs("The ferry left at six."),
		});
		const first = createSuggestion(
			db,
			{
				chapterId,
				passage: "ferry",
				alternatives: [{ text: "boat", reason: "Simpler" }, { text: "ship" }],
			},
			1,
		);
		const second = createSuggestion(
			db,
			{ chapterId, passage: "six", alternatives: [{ text: "seven" }] },
			2,
		);
		expect(listSuggestions(db, { writingId }).map((item) => item.id)).toEqual([
			second.id,
			first.id,
		]);
		expect(
			listSuggestions(db, { chapterId, status: "pending" })[0],
		).toMatchObject({ found: true, chapterTitle: "Arrival" });
		expect(loadRevisions(db, writingId).suggestions).toEqual([
			{ id: first.id, chapterId },
			{ id: second.id, chapterId },
		]);
		updateChapter(db, chapterId, {
			content: paragraphs("The boat left at six."),
		});
		expect(
			listSuggestions(db, { chapterId }).find((item) => item.id === first.id)
				?.found,
		).toBe(false);
		expect(() =>
			resolveSuggestion(db, first.id, { status: "accepted", index: 2 }),
		).toThrow("index");
		expect(
			resolveSuggestion(db, first.id, { status: "accepted", index: 1 }, 3),
		).toMatchObject({ status: "accepted", acceptedIndex: 1, resolvedAt: 3 });
		expect(resolveSuggestion(db, first.id, { status: "declined" })).toBeNull();
		expect(withdrawSuggestion(db, first.id)).toBe(false);
		expect(withdrawSuggestion(db, second.id, 4)).toBe(true);
		expect(withdrawSuggestion(db, second.id)).toBe(false);
		expect(resolveSuggestion(db, second.id, { status: "declined" })).toBeNull();
		const third = createSuggestion(db, {
			chapterId,
			passage: "boat",
			alternatives: [{ text: "raft" }],
		});
		expect(
			resolveSuggestion(db, third.id, { status: "declined" }, 5),
		).toMatchObject({ status: "declined", acceptedIndex: null, resolvedAt: 5 });
		expect(listSuggestions(db, {}).every((item) => !item.found)).toBe(true);
		expect(loadRevisions(db, writingId).suggestions).toEqual([]);
		db.delete(writingChapters).where(eq(writingChapters.id, chapterId)).run();
		expect(listSuggestions(db, {})).toEqual([]);
	}));
