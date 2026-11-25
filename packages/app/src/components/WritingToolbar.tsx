import { $isLinkNode, $toggleLink } from "@lexical/link";
import { $isListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	$isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	type BaseSelection,
	COMMAND_PRIORITY_LOW,
	FORMAT_TEXT_COMMAND,
	KEY_MODIFIER_COMMAND,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Block = "paragraph" | "h2" | "h3" | "quote" | "other";

const inlineFormats = [
	{ format: "bold", label: "Bold", shortcut: "⌘B", glyph: <b>B</b> },
	{
		format: "italic",
		label: "Italic",
		shortcut: "⌘I",
		glyph: <i className="font-serif">I</i>,
	},
	{
		format: "underline",
		label: "Underline",
		shortcut: "⌘U",
		glyph: <span className="underline underline-offset-2">U</span>,
	},
	{
		format: "strikethrough",
		label: "Strikethrough",
		glyph: <span className="line-through">S</span>,
	},
	{
		format: "highlight",
		label: "Highlight",
		glyph: <span className="writing-highlight px-0.5">H</span>,
	},
	{
		format: "code",
		label: "Inline code",
		glyph: <span className="font-mono text-xs">{"</>"}</span>,
	},
	{
		format: "superscript",
		label: "Superscript",
		glyph: (
			<span>
				x<sup className="text-[0.6em]">2</sup>
			</span>
		),
	},
] satisfies Array<{
	format: TextFormatType;
	label: string;
	shortcut?: string;
	glyph: ReactNode;
}>;

type ToolbarState = {
	top: number;
	left: number;
	block: Block;
	formats: Set<TextFormatType>;
	link: boolean;
};

/** Formatting controls that appear above selected text. */
export const WritingToolbar = () => {
	const [editor] = useLexicalComposerContext();
	const [state, setState] = useState<ToolbarState | null>(null);
	const [linkDraft, setLinkDraftState] = useState<string | null>(null);
	// Read by the update listener, which must not hide the toolbar while the
	// link field has focus and the editor's own selection looks empty.
	const editingLink = useRef(false);
	const setLinkDraft = (value: string | null) => {
		editingLink.current = value !== null;
		setLinkDraftState(value);
	};
	const savedSelection = useRef<BaseSelection | null>(null);

	const openLinkEditor = () => {
		editor.read(() => {
			savedSelection.current = $getSelection()?.clone() ?? null;
		});
		setLinkDraft("");
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: openLinkEditor only touches refs and setters.
	useEffect(
		() =>
			mergeRegister(
				editor.registerUpdateListener(({ editorState }) => {
					if (editingLink.current) return;
					editorState.read(() => {
						const selection = $getSelection();
						const native = window.getSelection();
						const root = editor.getRootElement();
						if (
							!$isRangeSelection(selection) ||
							selection.isCollapsed() ||
							!native?.rangeCount ||
							!root?.contains(native.anchorNode)
						) {
							setState(null);
							return;
						}

						const rect = native.getRangeAt(0).getBoundingClientRect();
						const anchor = selection.anchor.getNode();
						const block = anchor.getTopLevelElement();
						const formats = new Set(
							inlineFormats
								.map(({ format }) => format)
								.filter((format) => selection.hasFormat(format)),
						);
						setState({
							top: rect.top,
							left: rect.left + rect.width / 2,
							block: $isHeadingNode(block)
								? block.getTag() === "h3"
									? "h3"
									: "h2"
								: $isQuoteNode(block) && block.getType() === "quote"
									? "quote"
									: $isListNode(block) || $isQuoteNode(block)
										? "other"
										: "paragraph",
							formats,
							link: $findMatchingParent(anchor, $isLinkNode) !== null,
						});
					});
				}),
				editor.registerCommand(
					KEY_MODIFIER_COMMAND,
					(event) => {
						if (
							event.key.toLowerCase() !== "k" ||
							!(event.metaKey || event.ctrlKey)
						)
							return false;
						const selection = $getSelection();
						if (!$isRangeSelection(selection) || selection.isCollapsed())
							return false;
						event.preventDefault();
						openLinkEditor();
						return true;
					},
					COMMAND_PRIORITY_LOW,
				),
			),
		[editor],
	);

	// The toolbar is placed against the viewport, so any scroll (the page or a
	// note pane) would leave it behind; it hides until the selection changes.
	useEffect(() => {
		if (!state) return;
		const hide = () => {
			if (!editingLink.current) setState(null);
		};
		window.addEventListener("scroll", hide, { capture: true, passive: true });
		return () => window.removeEventListener("scroll", hide, { capture: true });
	}, [state]);

	if (!state) return null;

	const applyLink = (url: string | null) => {
		editor.update(() => {
			if (savedSelection.current) $setSelection(savedSelection.current);
			$toggleLink(url);
		});
		setLinkDraft(null);
		editor.focus();
	};

	return createPortal(
		<div
			aria-label="Format selection"
			className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border border-stone-200 bg-white p-1 text-stone-700 shadow-lg dark:border-stone-700 dark:text-stone-200"
			role="toolbar"
			style={{ top: state.top - 8, left: state.left }}
		>
			{linkDraft !== null ? (
				<form
					className="flex items-center gap-1"
					onSubmit={(event) => {
						event.preventDefault();
						const url = normalizeUrl(linkDraft);
						if (url) applyLink(url);
					}}
				>
					<input
						aria-label="Link address"
						onBlur={() => {
							setLinkDraft(null);
							setState(null);
						}}
						className="w-60 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-stone-400"
						onChange={(event) => setLinkDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								setLinkDraft(null);
								editor.focus();
							}
						}}
						placeholder="Paste or type a link, then Enter"
						ref={(element) => element?.focus()}
						value={linkDraft}
					/>
				</form>
			) : (
				<>
					{inlineFormats.map(({ format, label, shortcut, glyph }) => (
						<ToolbarButton
							active={state.formats.has(format)}
							key={format}
							label={shortcut ? `${label} (${shortcut})` : label}
							onClick={() =>
								editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
							}
						>
							{glyph}
						</ToolbarButton>
					))}
					<ToolbarButton
						active={state.link}
						label={state.link ? "Remove link" : "Link (⌘K)"}
						onClick={() => (state.link ? applyLink(null) : openLinkEditor())}
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="15"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="15"
						>
							<path d="M10 13a5 5 0 0 0 7.07 0l2-2A5 5 0 0 0 12 3.93l-1.15 1.15" />
							<path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.14-1.14" />
						</svg>
					</ToolbarButton>
					<Divider />
					<ToolbarButton
						active={state.block === "h2"}
						label="Heading"
						onClick={() => toggleBlock(editor, state.block, "h2")}
					>
						<span className="text-xs font-semibold">H2</span>
					</ToolbarButton>
					<ToolbarButton
						active={state.block === "h3"}
						label="Subheading"
						onClick={() => toggleBlock(editor, state.block, "h3")}
					>
						<span className="text-xs font-semibold">H3</span>
					</ToolbarButton>
					<ToolbarButton
						active={state.block === "quote"}
						label="Quote"
						onClick={() => toggleBlock(editor, state.block, "quote")}
					>
						<span className="font-serif text-lg leading-none">“</span>
					</ToolbarButton>
					<Divider />
					<ToolbarButton
						active={false}
						label="Clear formatting"
						onClick={() => clearFormatting(editor)}
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="15"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="15"
						>
							<path d="M4 7V4h16v3M9 20h6M12 4v16" />
							<path d="m3 3 18 18" />
						</svg>
					</ToolbarButton>
				</>
			)}
		</div>,
		document.body,
	);
};

const Divider = () => (
	<span
		aria-hidden="true"
		className="mx-0.5 h-4 w-px bg-stone-200 dark:bg-stone-700"
	/>
);

const ToolbarButton = ({
	active,
	label,
	onClick,
	children,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
	children: ReactNode;
}) => (
	<button
		aria-label={label}
		aria-pressed={active}
		className={`inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-stone-400 dark:hover:bg-stone-800 dark:hover:text-white ${active ? "bg-stone-100 text-stone-950 dark:bg-stone-800 dark:text-white" : ""}`}
		// Keeps the text selected while the button is pressed.
		onMouseDown={(event) => event.preventDefault()}
		onClick={onClick}
		title={label}
		type="button"
	>
		{children}
	</button>
);

const toggleBlock = (
	editor: LexicalEditor,
	current: Block,
	target: "h2" | "h3" | "quote",
) =>
	editor.update(() =>
		$setBlocksType($getSelection(), () =>
			current === target
				? $createParagraphNode()
				: target === "quote"
					? $createQuoteNode()
					: $createHeadingNode(target),
		),
	);

/** Removes inline styles and links from the selection; blocks stay as they are. */
const clearFormatting = (editor: LexicalEditor) =>
	editor.update(() => {
		const selection = $getSelection();
		if (!$isRangeSelection(selection)) return;
		$toggleLink(null);
		for (const node of selection.extract())
			if ($isTextNode(node)) node.setFormat(0).setStyle("");
	});

/** Accepts bare domains like "example.com" and rejects unsafe schemes. */
const normalizeUrl = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;
	if (!URL.canParse(withScheme)) return null;
	const { protocol } = new URL(withScheme);
	return ["http:", "https:", "mailto:"].includes(protocol) ? withScheme : null;
};
