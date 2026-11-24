import { defineExtension } from "@lexical/extension";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	$isQuoteNode,
	HeadingNode,
	QuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
	$createParagraphNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	type LexicalEditor,
} from "lexical";
import {
	type CSSProperties,
	Fragment,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { type PageSizeId, pageSizes } from "#/writing-page-sizes";

const PX_PER_INCH = 96;
const PAGE_GAP = 40;

/**
 * A Lexical editor laid out as a stack of printed pages. The document stays
 * one continuous editor; invisible floats block the space between pages, so
 * the browser moves each line that would cross a page edge onto the next page,
 * splitting paragraphs exactly where print would.
 */
export const PagedEditor = ({
	initialContent,
	pageSize,
	onChange,
	onTyping,
}: {
	/** Serialized Lexical state. Read once when the editor mounts. */
	initialContent: string | null;
	pageSize: PageSizeId;
	onChange: (content: string, wordCount: number) => void;
	/** Called on each keystroke so the page can hide its controls. */
	onTyping?: () => void;
}) => {
	const [extension] = useState(() =>
		defineExtension({
			name: "PagedWriting",
			namespace: "PagedWriting",
			nodes: () => [HeadingNode, QuoteNode],
			theme: {
				paragraph: "writing-paragraph",
				heading: { h2: "writing-heading" },
				quote: "writing-quote",
				text: { bold: "font-bold", italic: "italic" },
			},
			$initialEditorState: initialContent,
		}),
	);

	const size = pageSizes[pageSize];
	const width = size.width * PX_PER_INCH;
	const height = size.height * PX_PER_INCH;
	const margin = size.margin * PX_PER_INCH;
	const textHeight = height - 2 * margin;
	const stride = height + PAGE_GAP;

	const textRef = useRef<HTMLDivElement>(null);
	const [pageCount, setPageCount] = useState(1);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const text = textRef.current;
		if (!text) return;
		const observer = new ResizeObserver(() => {
			const used = Math.max(text.offsetHeight - 1, 0);
			setPageCount(Math.floor(used / stride) + 1);
		});
		observer.observe(text);
		return () => observer.disconnect();
	}, [stride]);

	useEffect(() => {
		const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / width));
		fit();
		window.addEventListener("resize", fit);
		return () => window.removeEventListener("resize", fit);
	}, [width]);

	return (
		<LexicalExtensionComposer extension={extension} contentEditable={null}>
			<PaperSurface
				textRef={textRef}
				style={{
					width,
					height: pageCount * stride - PAGE_GAP,
					fontSize: `${size.fontPt}pt`,
					zoom: scale,
				}}
			>
				{Array.from({ length: pageCount }, (_, page) => (
					<div
						aria-hidden="true"
						className="absolute inset-x-0 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]"
						// biome-ignore lint/suspicious/noArrayIndexKey: pages are positional.
						key={page}
						style={{ top: page * stride, height }}
					>
						<span
							className="absolute inset-x-0 text-center text-[0.75em] text-stone-400"
							style={{ bottom: margin / 2 - 8 }}
						>
							{page + 1}
						</span>
					</div>
				))}
				{/* Positioned so it forms its own block formatting context, which the
				    page-gap floats need to push lines inside the editor. */}
				<div
					className="absolute"
					style={{ top: margin, left: margin, width: width - 2 * margin }}
				>
					{Array.from({ length: pageCount + 1 }, (_, page) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: spacers are positional.
						<Fragment key={page}>
							<div
								aria-hidden="true"
								className="float-left clear-left w-0"
								style={{ height: textHeight }}
							/>
							<div
								aria-hidden="true"
								className="float-left clear-left w-full"
								style={{ height: 2 * margin + PAGE_GAP }}
							/>
						</Fragment>
					))}
					<div className="relative" ref={textRef}>
						<RichTextPlugin
							contentEditable={
								<ContentEditable
									aria-label="Chapter text"
									className="outline-none"
									onKeyDown={onTyping}
									spellCheck
								/>
							}
							placeholder={
								<p className="pointer-events-none absolute top-0 left-0 text-stone-400">
									Start writing…
								</p>
							}
							ErrorBoundary={LexicalErrorBoundary}
						/>
					</div>
				</div>
			</PaperSurface>
			{/* A new writing or chapter opens ready to type. */}
			{initialContent ? null : <AutoFocusPlugin />}
			<HistoryPlugin />
			<OnChangePlugin
				ignoreSelectionChange
				onChange={(state) => {
					const words = state.read(() =>
						$getRoot().getTextContent().split(/\s+/).filter(Boolean),
					).length;
					onChange(JSON.stringify(state.toJSON()), words);
				}}
			/>
			<SelectionToolbar />
		</LexicalExtensionComposer>
	);
};

/** Clicking the blank paper under the last line puts the cursor at the end. */
const PaperSurface = ({
	textRef,
	style,
	children,
}: {
	textRef: RefObject<HTMLDivElement | null>;
	style: CSSProperties;
	children: ReactNode;
}) => {
	const [editor] = useLexicalComposerContext();
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a mouse convenience; keyboard users are already in the editor.
		<div
			// Clips the spare page-gap floats so they don't extend the scroll area.
			className="writing-paper relative mx-auto overflow-hidden"
			onMouseDown={(event) => {
				const text = textRef.current?.getBoundingClientRect();
				if (!text || event.clientY < text.bottom) return;
				event.preventDefault();
				editor.update(() => $getRoot().selectEnd());
				editor.focus();
			}}
			style={style}
		>
			{children}
		</div>
	);
};

type BlockType = "paragraph" | "heading" | "quote";

const SelectionToolbar = () => {
	const [editor] = useLexicalComposerContext();
	const [state, setState] = useState<{
		top: number;
		left: number;
		block: BlockType;
		bold: boolean;
		italic: boolean;
	} | null>(null);

	useEffect(
		() =>
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					const selection = $getSelection();
					const native = window.getSelection();
					const root = editor.getRootElement();
					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed() ||
						!native?.rangeCount ||
						!root?.contains(native.anchorNode)
					)
						return setState(null);

					const rect = native.getRangeAt(0).getBoundingClientRect();
					const block = selection.anchor.getNode().getTopLevelElement();
					setState({
						top: rect.top + window.scrollY,
						left: rect.left + rect.width / 2 + window.scrollX,
						block: $isHeadingNode(block)
							? "heading"
							: $isQuoteNode(block)
								? "quote"
								: "paragraph",
						bold: selection.hasFormat("bold"),
						italic: selection.hasFormat("italic"),
					});
				});
			}),
		[editor],
	);

	if (!state) return null;

	return createPortal(
		<div
			className="absolute z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border border-stone-200 bg-white p-1 text-stone-700 shadow-lg dark:border-stone-700 dark:text-stone-200"
			role="toolbar"
			aria-label="Format selection"
			style={{ top: state.top - 8, left: state.left }}
		>
			<ToolbarButton
				active={state.bold}
				label="Bold"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
			>
				<span className="font-bold">B</span>
			</ToolbarButton>
			<ToolbarButton
				active={state.italic}
				label="Italic"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
			>
				<span className="font-serif italic">I</span>
			</ToolbarButton>
			<span
				aria-hidden="true"
				className="mx-0.5 h-4 w-px bg-stone-200 dark:bg-stone-700"
			/>
			<ToolbarButton
				active={state.block === "heading"}
				label="Heading"
				onClick={() => toggleBlock(editor, state.block, "heading")}
			>
				<span className="font-semibold">H</span>
			</ToolbarButton>
			<ToolbarButton
				active={state.block === "quote"}
				label="Quote"
				onClick={() => toggleBlock(editor, state.block, "quote")}
			>
				<span className="font-serif text-lg leading-none">“</span>
			</ToolbarButton>
		</div>,
		document.body,
	);
};

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
	current: BlockType,
	target: Exclude<BlockType, "paragraph">,
) =>
	editor.update(() =>
		$setBlocksType($getSelection(), () =>
			current === target
				? $createParagraphNode()
				: target === "heading"
					? $createHeadingNode("h2")
					: $createQuoteNode(),
		),
	);
