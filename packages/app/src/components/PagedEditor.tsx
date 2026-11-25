import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $getRoot } from "lexical";
import {
	type CSSProperties,
	Fragment,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { FootnotesList } from "#/components/WritingFootnotes";
import {
	createWritingExtension,
	WritingEditorPlugins,
} from "#/components/writing-editor-setup";
import { type PageSizeId, pageSizes } from "#/writing-page-sizes";

/** Screen pixels per printed inch, the CSS standard. */
export const PX_PER_INCH = 96;
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
	children,
}: {
	/** Serialized Lexical state. Read once when the editor mounts. */
	initialContent: string | null;
	pageSize: PageSizeId;
	onChange: (content: string, wordCount: number) => void;
	/** Called on each keystroke so the page can hide its controls. */
	onTyping?: () => void;
	/** Extra editor plugins, like the chapter's suggested edits. */
	children?: ReactNode;
}) => {
	const [extension] = useState(() =>
		createWritingExtension("PagedWriting", initialContent),
	);

	const size = pageSizes[pageSize];
	const width = size.width * PX_PER_INCH;
	const height = size.height * PX_PER_INCH;
	const margin = size.margin * PX_PER_INCH;
	const textHeight = height - 2 * margin;
	const stride = height + PAGE_GAP;

	const frameRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const [pageCount, setPageCount] = useState(1);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const text = textRef.current;
		if (!text) return;
		const observer = new ResizeObserver(() => {
			sizePageBreaks(text, stride, textHeight);
			const used = Math.max(text.offsetHeight - 1, 0);
			setPageCount(Math.floor(used / stride) + 1);
		});
		observer.observe(text);
		return () => observer.disconnect();
	}, [stride, textHeight]);

	// Pages shrink to fit the space they're given, which is narrower beside a
	// note than on their own.
	useEffect(() => {
		const frame = frameRef.current;
		if (!frame) return;
		const observer = new ResizeObserver(() =>
			setScale(Math.min(1, (frame.clientWidth - 24) / width)),
		);
		observer.observe(frame);
		return () => observer.disconnect();
	}, [width]);

	return (
		<LexicalExtensionComposer extension={extension} contentEditable={null}>
			<div className="w-full" ref={frameRef}>
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
							data-chapter-page
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
						style={{
							top: margin,
							left: margin,
							width: width - 2 * margin,
							// Images never grow taller than one page of text.
							["--page-text-height" as string]: `${textHeight}px`,
							// Shows only each page's text area, so backgrounds and borders of
							// blocks that cross a page edge don't paint over the gap.
							maskImage: `repeating-linear-gradient(to bottom, #000 0 ${textHeight}px, transparent ${textHeight}px ${stride}px)`,
						}}
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
							<FootnotesList />
						</div>
					</div>
				</PaperSurface>
			</div>
			{/* A new writing or chapter opens ready to type. */}
			<WritingEditorPlugins
				autoFocus={!initialContent}
				onChange={onChange}
				paged
			/>
			{children}
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
			// Clips the spare page-gap floats. "clip", unlike "hidden", also stops the browser scrolling this box to follow the cursor.
			className="writing-paper relative mx-auto overflow-clip"
			data-chapter-paper
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

/**
 * Stretches each page break to the bottom of its page so what follows starts
 * on the next one. Breaks are sized in order because each one moves the rest.
 */
const sizePageBreaks = (
	text: HTMLElement,
	stride: number,
	textHeight: number,
) => {
	for (const pageBreak of text.querySelectorAll<HTMLElement>(
		"[data-page-break]",
	)) {
		pageBreak.style.height = "0px";
		const top = pageBreak.offsetTop;
		const pageEnd = Math.floor(top / stride) * stride + textHeight;
		pageBreak.style.height = `${Math.max(0, pageEnd - top)}px`;
	}
};
