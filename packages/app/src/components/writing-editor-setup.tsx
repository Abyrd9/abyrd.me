// What the chapter and note editors share: the same blocks, look, and tools.
// Only their layout differs.
import { CodeHighlightNode, CodeNode } from "@lexical/code-core";
import { configExtension, defineExtension } from "@lexical/extension";
import { ClickableLinkExtension, LinkNode } from "@lexical/link";
import { $isListItemNode, ListItemNode, ListNode } from "@lexical/list";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
	$getRoot,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_LOW,
	INDENT_CONTENT_COMMAND,
	KEY_TAB_COMMAND,
	OUTDENT_CONTENT_COMMAND,
} from "lexical";
import { LibraryQuotePicker } from "#/components/LibraryQuotePicker";
import { WikiLinkNode } from "#/components/WikiLinkNode";
import { FootnoteNode } from "#/components/WritingFootnotes";
import { ImageNode, WritingImagePlugin } from "#/components/WritingImage";
import { WritingSlashMenu } from "#/components/WritingSlashMenu";
import { WritingSpellCheck } from "#/components/WritingSpellCheck";
import { WritingToolbar } from "#/components/WritingToolbar";
import {
	type WikiLinkContext,
	WikiLinkTitles,
	WritingWikiLinks,
} from "#/components/WritingWikiLinks";
import {
	CalloutNode,
	EpigraphNode,
	markdownShortcuts,
	PageBreakNode,
	registerVerseLines,
	SceneBreakNode,
	VerseNode,
} from "#/components/writing-nodes";

/**
 * Builds an editor extension that starts from saved content. Create it once per
 * mounted editor; a new object recreates the editor.
 */
export const createWritingExtension = (
	name: string,
	initialContent: string | null,
) =>
	defineExtension({
		name,
		namespace: name,
		nodes: () => [
			HeadingNode,
			QuoteNode,
			ListNode,
			ListItemNode,
			LinkNode,
			CodeNode,
			CodeHighlightNode,
			EpigraphNode,
			VerseNode,
			CalloutNode,
			SceneBreakNode,
			PageBreakNode,
			ImageNode,
			FootnoteNode,
			WikiLinkNode,
		],
		theme: {
			paragraph: "writing-paragraph",
			heading: {
				h1: "writing-heading",
				h2: "writing-heading",
				h3: "writing-subheading",
			},
			quote: "writing-quote",
			epigraph: "writing-epigraph",
			verse: "writing-verse",
			callout: "writing-callout",
			sceneBreak: "writing-scene-break",
			pageBreak: "writing-page-break",
			code: "writing-code",
			link: "writing-link",
			list: {
				ul: "writing-list list-disc",
				ol: "writing-list list-decimal",
				nested: { listitem: "list-none" },
			},
			text: {
				bold: "font-bold",
				italic: "italic",
				underline: "underline underline-offset-[0.15em]",
				strikethrough: "line-through",
				underlineStrikethrough: "underline line-through",
				highlight: "writing-highlight",
				code: "writing-inline-code",
				superscript: "writing-superscript",
			},
		},
		register: (editor) =>
			mergeRegister(
				registerVerseLines(editor),
				editor.registerCommand(
					KEY_TAB_COMMAND,
					(event) => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) return false;
						const inList = [selection.anchor, selection.focus].some((point) =>
							$findMatchingParent(point.getNode(), $isListItemNode),
						);
						if (!inList) return false;
						event.preventDefault();
						editor.dispatchCommand(
							event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
							undefined,
						);
						return true;
					},
					COMMAND_PRIORITY_LOW,
				),
			),
		// Links in saved text are references to read, so open them on a click.
		// Lexical's default keeps the click in the editor for editing instead.
		dependencies: [configExtension(ClickableLinkExtension, { newTab: true })],
		$initialEditorState: initialContent,
	});

/** Editing tools, menus, and change reporting, without any layout. */
export const WritingEditorPlugins = ({
	autoFocus,
	onChange,
	paged,
	wiki,
}: {
	/** Puts the cursor in the editor as soon as it mounts. */
	autoFocus: boolean;
	onChange: (content: string, wordCount: number) => void;
	/** Paged editors offer page breaks; endless notes don't. */
	paged: boolean;
	wiki: WikiLinkContext;
}) => (
	<>
		{autoFocus ? <AutoFocusPlugin /> : null}
		<HistoryPlugin />
		<ListPlugin />
		<LinkPlugin />
		<MarkdownShortcutPlugin transformers={markdownShortcuts} />
		<WritingSlashMenu paged={paged} />
		<WritingImagePlugin />
		<WikiLinkTitles />
		<WritingWikiLinks {...wiki} />
		<LibraryQuotePicker />
		<OnChangePlugin
			ignoreSelectionChange
			onChange={(state) => {
				const words = state.read(() =>
					$getRoot().getTextContent().split(/\s+/).filter(Boolean),
				).length;
				onChange(JSON.stringify(state.toJSON()), words);
			}}
		/>
		<WritingToolbar />
		<WritingSpellCheck />
	</>
);
