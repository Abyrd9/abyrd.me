import { Dialog } from "@base-ui/react/dialog";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createQuoteNode } from "@lexical/rich-text";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isParagraphNode,
	$isRangeSelection,
	$setSelection,
	type BaseSelection,
	COMMAND_PRIORITY_LOW,
	createCommand,
	type LexicalEditor,
} from "lexical";
import { useEffect, useRef, useState } from "react";
import {
	formatKindleCitation,
	formatQuoteCitation,
} from "#/components/citation";
import { $createFootnoteNode } from "#/components/WritingFootnotes";
import { loadKindleLibrary } from "#/server/kindle-functions";
import { loadQuotes } from "#/server/quotes-functions";

/** Opens the picker of saved quotes and Kindle highlights. */
export const OPEN_LIBRARY_PICKER_COMMAND = createCommand<void>(
	"OPEN_LIBRARY_PICKER",
);

type LibraryItem = {
	key: string;
	kind: "kindle" | "quote";
	text: string;
	source: string;
	citation: string;
};

const filters = { all: "All", kindle: "Kindle", quote: "Quotes" } as const;
type Filter = keyof typeof filters;

const loadLibrary = async (): Promise<LibraryItem[]> => {
	const [kindle, quotes] = await Promise.all([
		loadKindleLibrary(),
		loadQuotes(),
	]);
	return [
		...quotes.map((quote) => ({
			key: `quote:${quote.id}`,
			kind: "quote" as const,
			text: quote.text,
			source: [quote.attribution, quote.sourceTitle]
				.filter(Boolean)
				.join(" · "),
			citation: formatQuoteCitation(quote),
		})),
		...kindle.annotations.flatMap((annotation) =>
			annotation.highlight
				? [
						{
							key: `kindle:${annotation.id}`,
							kind: "kindle" as const,
							text: annotation.highlight,
							source: [annotation.author, annotation.title]
								.filter(Boolean)
								.join(" · "),
							citation: formatKindleCitation(annotation),
						},
					]
				: [],
		),
	];
};

/**
 * Puts the quotation in its own quote block after the cursor's block (or in
 * place of an empty one), ends it with a footnote holding the citation, and
 * leaves the cursor on a fresh line below.
 */
const insertQuotation = (
	editor: LexicalEditor,
	item: LibraryItem,
	selection: BaseSelection | null,
) =>
	editor.update(() => {
		if (selection) $setSelection(selection.clone());
		const current = $getSelection();
		const block = $isRangeSelection(current)
			? current.anchor.getNode().getTopLevelElement()
			: null;

		const quote = $createQuoteNode().append($createTextNode(item.text.trim()));
		if (item.citation)
			quote.append($createFootnoteNode().setNote(item.citation));

		if (block && $isElementNode(block) && block.getTextContent().trim() === "")
			block.replace(quote);
		else if (block) block.insertAfter(quote);
		else $getRoot().append(quote);

		const next = quote.getNextSibling();
		if ($isParagraphNode(next) && next.getTextContent() === "")
			next.selectStart();
		else quote.insertAfter($createParagraphNode()).selectStart();
	});

/** Registers the command and renders the picker dialog. */
export const LibraryQuotePicker = () => {
	const [editor] = useLexicalComposerContext();
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<LibraryItem[] | null>(null);
	const [error, setError] = useState(false);
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<Filter>("all");
	const [active, setActive] = useState(0);
	const savedSelection = useRef<BaseSelection | null>(null);

	useEffect(
		() =>
			editor.registerCommand(
				OPEN_LIBRARY_PICKER_COMMAND,
				() => {
					savedSelection.current = $getSelection()?.clone() ?? null;
					setQuery("");
					setActive(0);
					setOpen(true);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		[editor],
	);

	useEffect(() => {
		if (!open || items) return;
		void loadLibrary()
			.then(setItems)
			.catch(() => setError(true));
	}, [open, items]);

	const search = query.trim().toLowerCase();
	const matches = (items ?? []).filter(
		(item) =>
			(filter === "all" || item.kind === filter) &&
			`${item.text} ${item.source}`.toLowerCase().includes(search),
	);

	// The dialog's own focus return is off; the editor takes focus back once
	// the dialog is gone, at the selection the insert left.
	const returnFocus = () => requestAnimationFrame(() => editor.focus());

	const choose = (item: LibraryItem) => {
		setOpen(false);
		insertQuotation(editor, item, savedSelection.current);
		returnFocus();
	};

	return (
		<Dialog.Root
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) returnFocus();
			}}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]" />
				<Dialog.Popup
					finalFocus={false}
					className="fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[min(92vw,40rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white font-sans shadow-2xl outline-none dark:border-stone-700"
				>
					<div className="border-b border-stone-200 p-3 dark:border-stone-800">
						<Dialog.Title className="sr-only">
							Insert a quote from your library
						</Dialog.Title>
						<input
							aria-label="Search quotes and highlights"
							className="w-full bg-transparent px-2 py-1.5 text-base text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
							onChange={(event) => {
								setQuery(event.target.value);
								setActive(0);
							}}
							onKeyDown={(event) => {
								if (event.key === "ArrowDown") {
									event.preventDefault();
									setActive((index) => Math.min(index + 1, matches.length - 1));
								} else if (event.key === "ArrowUp") {
									event.preventDefault();
									setActive((index) => Math.max(index - 1, 0));
								} else if (event.key === "Enter" && matches[active]) {
									event.preventDefault();
									choose(matches[active]);
								}
							}}
							placeholder="Search your quotes and Kindle highlights"
							ref={(element) => element?.focus()}
							value={query}
						/>
						<div className="mt-2 flex gap-1 px-1 text-xs">
							{Object.entries(filters).map(([id, label]) => (
								<button
									aria-pressed={filter === id}
									className={`rounded-full px-2.5 py-1 transition-colors ${filter === id ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
									key={id}
									onClick={() => {
										if (id in filters) setFilter(id as Filter);
										setActive(0);
									}}
									type="button"
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div
						className="overflow-y-auto p-1.5"
						role="listbox"
						aria-label="Quotes and highlights"
					>
						{error ? (
							<p className="p-4 text-sm text-red-700">
								Could not load your library. Close and try again.
							</p>
						) : !items ? (
							<p className="p-4 text-sm text-stone-500">
								Loading your library…
							</p>
						) : matches.length === 0 ? (
							<p className="p-4 text-sm text-stone-500">
								{search
									? "Nothing matches that search."
									: "No saved quotes or highlights yet."}
							</p>
						) : (
							matches.map((item, index) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents: arrow keys and Enter in the search field drive the list.
								<div
									aria-selected={index === active}
									className={`cursor-pointer rounded-xl px-3 py-2.5 ${index === active ? "bg-stone-100 dark:bg-stone-800" : ""}`}
									key={item.key}
									onClick={() => choose(item)}
									onMouseEnter={() => setActive(index)}
									ref={(element) => {
										if (index === active)
											element?.scrollIntoView({ block: "nearest" });
									}}
									role="option"
									tabIndex={-1}
								>
									<p className="font-book line-clamp-3 text-[15px] leading-snug text-stone-900 dark:text-stone-100">
										“{item.text.trim()}”
									</p>
									<p className="mt-1 flex items-center gap-2 text-xs text-stone-500">
										<span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:bg-stone-800">
											{item.kind === "kindle" ? "Kindle" : "Quote"}
										</span>
										<span className="truncate">
											{item.source || "No source"}
										</span>
									</p>
								</div>
							))
						)}
					</div>
					<p className="border-t border-stone-200 px-4 py-2 text-xs text-stone-400 dark:border-stone-800">
						↑↓ to move · Enter to insert with a footnote citation · Esc to close
					</p>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
