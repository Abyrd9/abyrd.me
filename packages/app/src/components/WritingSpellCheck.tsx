// Spelling and grammar checking with Harper, which runs entirely in the
// browser. Underlines are painted with the CSS Custom Highlight API, so they
// never touch the document, its saved JSON, page layout, or undo history.
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Lint, Linter } from "harper.js";
import { $createRangeSelection, $setSelection } from "lexical";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	$readBlocks,
	type Block,
	blockRange,
} from "#/components/writing-blocks";
import {
	addDictionaryWord,
	listDictionaryWords,
} from "#/server/writing-dictionary-functions";

const IGNORED_KEY = "writing-ignored-lints";

type Fix =
	| { kind: "replace"; text: string }
	| { kind: "remove" }
	| { kind: "insert"; text: string };

/** One problem Harper found, with offsets into its block's text. */
type Issue = {
	start: number;
	end: number;
	spelling: boolean;
	title: string;
	message: string;
	word: string;
	fixes: Fix[];
	lint: Lint;
};

/** An issue placed on screen, with what's needed to fix it. */
type Placed = {
	issue: Issue;
	block: Block;
	range: Range;
	anchor: { key: string; offset: number };
	focus: { key: string; offset: number };
};

// Shared by every editor on the page: one linter, one set of results, and one
// highlight per kind of problem.
let checker: Promise<Linter | null> | undefined;
const results = new Map<string, Issue[]>();
const listeners = new Set<() => void>();

const supported = () =>
	typeof CSS !== "undefined" &&
	"highlights" in CSS &&
	typeof Highlight !== "undefined";

const highlight = (name: string) => {
	let found = CSS.highlights.get(name);
	if (!found) {
		found = new Highlight();
		CSS.highlights.set(name, found);
	}
	return found;
};

/** Loads Harper once, along with the writer's own words and ignored problems. */
const loadChecker = () => {
	checker ??= (async () => {
		if (!supported()) return null;
		const [{ WorkerLinter }, { binary }] = await Promise.all([
			import("harper.js"),
			import("harper.js/binary"),
		]);
		const linter = new WorkerLinter({ binary });
		await linter.setup();
		const [words] = await Promise.all([
			listDictionaryWords().catch(() => []),
			(async () => {
				const ignored = localStorage.getItem(IGNORED_KEY);
				if (ignored) await linter.importIgnoredLints(ignored);
			})(),
		]);
		if (words.length) await linter.importWords(words);
		return linter;
	})().catch((error) => {
		console.error("Spell check failed to load", error);
		return null;
	});
	return checker;
};

/** Forgets every result, so all editors check their text again. */
const recheckAll = () => {
	for (const issues of results.values())
		for (const issue of issues) issue.lint.free();
	results.clear();
	for (const listener of listeners) listener();
};

// Harper's JavaScript build reports spans in UTF-16 units, like the DOM.
const toIssues = (lints: Lint[]): Issue[] =>
	lints.map((lint) => {
		const span = lint.span();
		const fixes = lint.suggestions().map((suggestion): Fix => {
			const kind = suggestion.kind();
			const replacement = suggestion.get_replacement_text();
			if (kind === 1) return { kind: "remove" };
			if (kind === 2) return { kind: "insert", text: replacement };
			return { kind: "replace", text: replacement };
		});
		return {
			start: span.start,
			end: span.end,
			// Typos like "teh" read as misspellings, so they share the red underline.
			spelling: ["Spelling", "Typo"].includes(lint.lint_kind()),
			title: lint.lint_kind_pretty(),
			// Harper wraps quoted words in Markdown backticks.
			message: lint.message().replace(/`([^`]*)`/g, "“$1”"),
			word: lint.get_problem_text(),
			fixes,
			lint,
		};
	});

/** Spelling and grammar underlines, with a card of fixes for each. */
export const WritingSpellCheck = () => {
	const [editor] = useLexicalComposerContext();
	const [open, setOpen] = useState<{ placed: Placed; rect: DOMRect } | null>(
		null,
	);
	const placedRef = useRef<Placed[]>([]);
	const [linter, setLinter] = useState<Linter | null>(null);

	useEffect(() => {
		let active = true;
		loadChecker().then((loaded) => {
			if (active) setLinter(loaded);
		});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!linter) return;
		const spelling = highlight("writing-spelling");
		const grammar = highlight("writing-grammar");
		const clear = () => {
			for (const { range } of placedRef.current) {
				spelling.delete(range);
				grammar.delete(range);
			}
			placedRef.current = [];
		};

		let timer: ReturnType<typeof setTimeout> | undefined;
		let checking = false;
		let disposed = false;

		/** Checks blocks that have changed, one at a time, then redraws. */
		const check = async (texts: string[]) => {
			if (checking) return;
			checking = true;
			for (const text of texts) {
				if (disposed) break;
				if (results.has(text)) continue;
				// Old paragraph versions pile up while typing; start fresh now and then.
				if (results.size > 2000) recheckAll();
				const lints = await linter.lint(text, { language: "plaintext" });
				results.set(text, toIssues(lints));
			}
			checking = false;
			if (!disposed) redraw();
		};

		/** Draws underlines for every block already checked, and queues the rest. */
		const redraw = () => {
			clear();
			const blocks = editor.getEditorState().read($readBlocks);
			const unchecked: string[] = [];
			for (const block of blocks) {
				const issues = results.get(block.text);
				if (!issues) {
					unchecked.push(block.text);
					continue;
				}
				for (const issue of issues) {
					const placed = blockRange(editor, block, issue.start, issue.end);
					if (!placed) continue;
					(issue.spelling ? spelling : grammar).add(placed.range);
					placedRef.current.push({ issue, block, ...placed });
				}
			}
			clearTimeout(timer);
			// Waits for a pause in typing, so half-typed words aren't flagged.
			if (unchecked.length) timer = setTimeout(() => check(unchecked), 600);
		};

		listeners.add(redraw);
		const root = editor.getRootElement();
		if (root) root.spellcheck = false;
		redraw();
		const unregister = editor.registerUpdateListener(
			({ dirtyElements, dirtyLeaves }) => {
				if (dirtyElements.size || dirtyLeaves.size) {
					setOpen(null);
					redraw();
				}
			},
		);
		return () => {
			disposed = true;
			clearTimeout(timer);
			unregister();
			listeners.delete(redraw);
			clear();
			if (root) root.spellcheck = true;
		};
	}, [editor, linter]);

	// Clicking an underline opens its card.
	useEffect(() => {
		if (!linter) return;
		return editor.registerRootListener((root, previous) => {
			const onClick = (event: MouseEvent) => {
				for (const placed of placedRef.current) {
					for (const rect of placed.range.getClientRects()) {
						if (
							event.clientX >= rect.left &&
							event.clientX <= rect.right &&
							event.clientY >= rect.top - 2 &&
							event.clientY <= rect.bottom + 2
						) {
							setOpen({ placed, rect });
							return;
						}
					}
				}
				setOpen(null);
			};
			previous?.removeEventListener("click", onClick);
			root?.addEventListener("click", onClick);
		});
	}, [editor, linter]);

	// Escape or a click outside closes the card, leaving the cursor where it was.
	const card = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(null);
		};
		const onDown = (event: PointerEvent) => {
			if (!card.current?.contains(event.target as Node)) setOpen(null);
		};
		document.addEventListener("keydown", onKey, true);
		document.addEventListener("pointerdown", onDown, true);
		return () => {
			document.removeEventListener("keydown", onKey, true);
			document.removeEventListener("pointerdown", onDown, true);
		};
	}, [open]);

	if (!open || !linter) return null;
	const { placed, rect } = open;
	const { issue } = placed;

	const apply = (fix: Fix) => {
		editor.update(() => {
			const selection = $createRangeSelection();
			const { anchor, focus } = placed;
			if (fix.kind === "insert") {
				selection.anchor.set(focus.key, focus.offset, "text");
				selection.focus.set(focus.key, focus.offset, "text");
			} else {
				selection.anchor.set(anchor.key, anchor.offset, "text");
				selection.focus.set(focus.key, focus.offset, "text");
			}
			$setSelection(selection);
			selection.insertText(fix.kind === "remove" ? "" : fix.text);
		});
		setOpen(null);
		editor.focus();
	};

	const ignore = async () => {
		setOpen(null);
		await linter.ignoreLint(placed.block.text, issue.lint);
		localStorage.setItem(IGNORED_KEY, await linter.exportIgnoredLints());
		recheckAll();
	};

	const addWord = async () => {
		setOpen(null);
		await linter.importWords([issue.word]);
		recheckAll();
		await addDictionaryWord({ data: { word: issue.word } });
	};

	return createPortal(
		<div
			className="fixed z-50 w-64 rounded-xl border border-stone-200 bg-white p-1.5 font-sans text-sm shadow-xl dark:border-stone-700 dark:bg-stone-900"
			ref={card}
			role="dialog"
			aria-label={issue.title}
			style={{
				top: Math.min(rect.bottom + 6, window.innerHeight - 220),
				left: Math.min(rect.left, window.innerWidth - 264),
			}}
		>
			<p className="px-2 pt-1 text-xs font-medium text-stone-500 dark:text-stone-400">
				<span
					className={`mr-1.5 inline-block size-2 rounded-full ${issue.spelling ? "bg-red-500" : "bg-blue-500"}`}
				/>
				{issue.title}
			</p>
			<p className="px-2 pt-1 pb-1.5 text-stone-700 dark:text-stone-300">
				{issue.message}
			</p>
			{issue.fixes.length ? (
				<div className="flex flex-col">
					{issue.fixes.slice(0, 5).map((fix, index) => (
						<button
							// biome-ignore lint/suspicious/noArrayIndexKey: suggestions are positional.
							key={index}
							className="rounded-md px-2 py-1 text-left font-book text-[15px] text-stone-900 hover:bg-stone-100 focus:bg-stone-100 focus:outline-none dark:text-stone-100 dark:hover:bg-stone-800 dark:focus:bg-stone-800"
							onClick={() => apply(fix)}
							type="button"
						>
							{fix.kind === "remove"
								? `Remove “${issue.word}”`
								: fix.kind === "insert"
									? `Add “${fix.text}”`
									: fix.text || "(remove)"}
						</button>
					))}
				</div>
			) : null}
			<div className="mt-1 flex gap-1 border-t border-stone-100 pt-1 dark:border-stone-800">
				<button
					className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
					onClick={ignore}
					type="button"
				>
					Ignore
				</button>
				{/* Typos like "teh" come from grammar rules, which the dictionary can't silence. */}
				{issue.title === "Spelling" ? (
					<button
						className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
						onClick={addWord}
						type="button"
					>
						Add to dictionary
					</button>
				) : null}
			</div>
		</div>,
		document.body,
	);
};
