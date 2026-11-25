// Suggested edits on a chapter: each suggested passage turns red in the text,
// and a card in the margin left of the page offers the replacement text,
// with arrows when there are alternatives, and Accept or Decline. Passages
// are painted with the CSS Custom Highlight API, so the document itself
// doesn't change until a suggestion is accepted.
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createRangeSelection, $setSelection } from "lexical";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	$readBlocks,
	type Block,
	blockRange,
} from "#/components/writing-blocks";

export type ChapterSuggestion = {
	id: number;
	passage: string;
	alternatives: Array<{ text: string; reason: string | null }>;
};

export type SuggestionOutcome =
	| { status: "accepted"; index: number }
	| { status: "declined" };

type Placed = {
	suggestion: ChapterSuggestion;
	range: Range;
	anchor: { key: string; offset: number };
	focus: { key: string; offset: number };
};

const CARD_WIDTH = 256;
const CARD_GAP = 20;
const STACK_GAP = 10;

const highlight = (name: string) => {
	let found = CSS.highlights.get(name);
	if (!found) {
		found = new Highlight();
		CSS.highlights.set(name, found);
	}
	return found;
};

/** Where a passage sits, if it occurs exactly once within a single block. */
const findPassage = (blocks: Block[], passage: string) => {
	let found: { block: Block; start: number } | null = null;
	for (const block of blocks) {
		let at = block.text.indexOf(passage);
		while (at !== -1) {
			if (found) return null;
			found = { block, start: at };
			at = block.text.indexOf(passage, at + 1);
		}
	}
	return found;
};

export const ChapterSuggestions = ({
	suggestions,
	onResolve,
}: {
	/** Pending suggestions for this chapter. */
	suggestions: ChapterSuggestion[];
	onResolve: (id: number, outcome: SuggestionOutcome) => void;
}) => {
	const [editor] = useLexicalComposerContext();
	const [placed, setPlaced] = useState<Placed[]>([]);
	const [active, setActive] = useState<number | null>(null);
	const [choices, setChoices] = useState(new Map<number, number>());
	const [layout, setLayout] = useState<{
		/** Null when there's no room left of the page; cards then open on click. */
		left: number | null;
		tops: Map<number, number>;
		passages: Map<number, DOMRect>;
	}>({ left: null, tops: new Map(), passages: new Map() });
	const heights = useRef(new Map<number, number>());
	// Lays the cards out again; set by the layout effect below.
	const relayout = useRef(() => {});
	const placedRef = useRef(placed);
	placedRef.current = placed;

	const supported = typeof CSS !== "undefined" && "highlights" in CSS;

	// Finds each passage in the text and paints it, whenever the text changes.
	useEffect(() => {
		if (!supported) return;
		const all = highlight("writing-suggestion");
		let ranges: Range[] = [];
		const clear = () => {
			for (const range of ranges) all.delete(range);
			ranges = [];
		};
		const place = () => {
			clear();
			const blocks = editor.getEditorState().read($readBlocks);
			const next: Placed[] = [];
			for (const suggestion of suggestions) {
				const found = findPassage(blocks, suggestion.passage);
				if (!found) continue;
				const range = blockRange(
					editor,
					found.block,
					found.start,
					found.start + suggestion.passage.length,
				);
				if (!range) continue;
				all.add(range.range);
				ranges.push(range.range);
				next.push({ suggestion, ...range });
			}
			setPlaced(next);
		};
		place();
		const unregister = editor.registerUpdateListener(
			({ dirtyElements, dirtyLeaves }) => {
				if (dirtyElements.size || dirtyLeaves.size) place();
			},
		);
		return () => {
			unregister();
			clear();
		};
	}, [editor, suggestions, supported]);

	// The passage under the pointer or chosen card shows a deeper red.
	useEffect(() => {
		if (!supported) return;
		const strong = highlight("writing-suggestion-active");
		const range = placed.find((item) => item.suggestion.id === active)?.range;
		if (range) strong.add(range);
		return () => {
			if (range) strong.delete(range);
		};
	}, [active, placed, supported]);

	// Lines each card up with its passage, pushing cards down so they don't
	// overlap, and follows the page as it scrolls or resizes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: passages are read through a ref; placed changing is what calls for a new layout.
	useEffect(() => {
		let frame = 0;
		const measure = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const paper = document
					.querySelector("[data-chapter-paper]")
					?.getBoundingClientRect();
				const left = paper ? paper.left - CARD_WIDTH - CARD_GAP : -1;
				const passages = new Map<number, DOMRect>();
				for (const item of placedRef.current) {
					const first = item.range.getClientRects()[0];
					if (first) passages.set(item.suggestion.id, first);
				}
				const tops = new Map<number, number>();
				let floor = Number.NEGATIVE_INFINITY;
				for (const [id, rect] of [...passages].sort(
					(a, b) => a[1].top - b[1].top,
				)) {
					const top = Math.max(rect.top - 6, floor);
					tops.set(id, top);
					floor = top + (heights.current.get(id) ?? 120) + STACK_GAP;
				}
				setLayout({ left: left >= 8 ? left : null, tops, passages });
			});
		};
		relayout.current = measure;
		measure();
		const observer = new ResizeObserver(measure);
		const paper = document.querySelector("[data-chapter-paper]");
		if (paper) observer.observe(paper);
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, {
			capture: true,
			passive: true,
		});
		const unregister = editor.registerUpdateListener(measure);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure, { capture: true });
			unregister();
		};
	}, [editor, placed]);

	// Clicking a red passage picks its card.
	useEffect(
		() =>
			editor.registerRootListener((root, previous) => {
				const onClick = (event: MouseEvent) => {
					const hit = placedRef.current.find((item) =>
						[...item.range.getClientRects()].some(
							(rect) =>
								event.clientX >= rect.left &&
								event.clientX <= rect.right &&
								event.clientY >= rect.top &&
								event.clientY <= rect.bottom,
						),
					);
					setActive(hit ? hit.suggestion.id : null);
				};
				previous?.removeEventListener("click", onClick);
				root?.addEventListener("click", onClick);
			}),
		[editor],
	);

	const accept = (item: Placed, index: number) => {
		const replacement = item.suggestion.alternatives[index]?.text ?? "";
		editor.update(() => {
			const selection = $createRangeSelection();
			selection.anchor.set(item.anchor.key, item.anchor.offset, "text");
			selection.focus.set(item.focus.key, item.focus.offset, "text");
			$setSelection(selection);
			selection.insertText(replacement);
		});
		onResolve(item.suggestion.id, { status: "accepted", index });
	};

	if (!placed.length) return null;

	const cards = placed.flatMap((item) => {
		const { id } = item.suggestion;
		const passage = layout.passages.get(id);
		if (!passage) return [];
		// Without room in the margin, only the chosen card shows, under its passage.
		if (layout.left === null && active !== id) return [];
		const style =
			layout.left === null
				? {
						top: passage.bottom + 8,
						left: Math.max(
							8,
							Math.min(passage.left, window.innerWidth - CARD_WIDTH - 8),
						),
					}
				: { top: layout.tops.get(id) ?? passage.top, left: layout.left };
		return [
			<SuggestionCard
				active={active === id}
				choice={choices.get(id) ?? 0}
				item={item}
				key={id}
				onAccept={(index) => accept(item, index)}
				onChoose={(index) =>
					setChoices((current) => new Map(current).set(id, index))
				}
				onDecline={() => onResolve(id, { status: "declined" })}
				onFocus={(focused) => setActive(focused ? id : null)}
				onHeight={(height) => {
					if (heights.current.get(id) === height) return;
					heights.current.set(id, height);
					relayout.current();
				}}
				style={style}
			/>,
		];
	});

	return createPortal(cards, document.body);
};

const SuggestionCard = ({
	item,
	choice,
	active,
	style,
	onChoose,
	onAccept,
	onDecline,
	onFocus,
	onHeight,
}: {
	item: Placed;
	choice: number;
	active: boolean;
	style: { top: number; left: number };
	onChoose: (index: number) => void;
	onAccept: (index: number) => void;
	onDecline: () => void;
	onFocus: (focused: boolean) => void;
	onHeight: (height: number) => void;
}) => {
	const card = useRef<HTMLDivElement>(null);
	// Read through a ref so a new callback each render doesn't re-observe.
	const heightChanged = useRef(onHeight);
	heightChanged.current = onHeight;
	const { alternatives } = item.suggestion;
	const count = alternatives.length;
	const index = Math.min(choice, count - 1);
	const alternative = alternatives[index];

	useEffect(() => {
		const element = card.current;
		if (!element) return;
		const observer = new ResizeObserver(() =>
			heightChanged.current(element.getBoundingClientRect().height),
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const arrow =
		"grid size-6 place-items-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800 dark:hover:text-stone-100";

	return (
		<section
			aria-label="Suggested edit"
			className={`fixed z-30 rounded-xl border bg-white p-3 font-sans text-sm shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] transition-[top,box-shadow] duration-150 motion-reduce:transition-none dark:bg-stone-900 ${active ? "border-red-300 ring-2 ring-red-100 dark:border-red-800 dark:ring-red-950" : "border-stone-200 dark:border-stone-700"}`}
			onBlur={() => onFocus(false)}
			onFocus={() => onFocus(true)}
			onMouseEnter={() => onFocus(true)}
			onMouseLeave={() => onFocus(false)}
			ref={card}
			style={{ ...style, width: CARD_WIDTH }}
		>
			<header className="mb-1.5 flex items-center justify-between">
				<span className="text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
					Suggestion
				</span>
				{count > 1 ? (
					<span className="flex items-center gap-0.5 text-xs text-stone-500 tabular-nums">
						<button
							aria-label="Previous alternative"
							className={arrow}
							disabled={index === 0}
							onClick={() => onChoose(index - 1)}
							type="button"
						>
							‹
						</button>
						{index + 1} of {count}
						<button
							aria-label="Next alternative"
							className={arrow}
							disabled={index === count - 1}
							onClick={() => onChoose(index + 1)}
							type="button"
						>
							›
						</button>
					</span>
				) : null}
			</header>
			<p className="font-book text-[15px] leading-snug text-stone-900 dark:text-stone-100">
				{alternative?.text ? (
					alternative.text
				) : (
					<span className="text-stone-500 italic">Delete this passage</span>
				)}
			</p>
			{alternative?.reason ? (
				<p className="mt-1.5 text-xs leading-snug text-stone-500">
					{alternative.reason}
				</p>
			) : null}
			<div className="mt-3 flex gap-1.5">
				<button
					className="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
					onClick={() => onAccept(index)}
					type="button"
				>
					Accept
				</button>
				<button
					className="rounded-md px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
					onClick={onDecline}
					type="button"
				>
					Decline
				</button>
			</div>
		</section>
	);
};
