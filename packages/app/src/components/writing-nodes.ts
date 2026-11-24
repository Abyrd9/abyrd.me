// Custom blocks for the writing editor, plus the Markdown shortcuts that
// create them. Epigraph, verse, and callout reuse QuoteNode's editing behavior
// and differ only in how they look; the breaks are empty blocks.
import type {
	ElementTransformer,
	MultilineElementTransformer,
	TextFormatTransformer,
	TextMatchTransformer,
} from "@lexical/markdown";
import {
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	CODE,
	HIGHLIGHT,
	INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	LINK,
	ORDERED_LIST,
	QUOTE,
	STRIKETHROUGH,
	UNORDERED_LIST,
} from "@lexical/markdown";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
	$create,
	$createParagraphNode,
	$getSelection,
	$isLineBreakNode,
	$isRangeSelection,
	COMMAND_PRIORITY_LOW,
	DecoratorNode,
	type EditorConfig,
	KEY_ENTER_COMMAND,
	type LexicalEditor,
	type LexicalNode,
} from "lexical";

const styledBlock = (config: EditorConfig, tag: string, themeKey: string) => {
	const element = document.createElement(tag);
	const className = config.theme[themeKey];
	if (typeof className === "string") element.className = className;
	return element;
};

/** A short quotation that opens a chapter, set narrow and to the right. */
export class EpigraphNode extends QuoteNode {
	$config() {
		return this.config("epigraph", { extends: QuoteNode });
	}

	createDOM(config: EditorConfig) {
		return styledBlock(config, "blockquote", "epigraph");
	}
}

/** Poetry or lyrics. Enter starts a new line; Enter on an empty line leaves. */
export class VerseNode extends QuoteNode {
	$config() {
		return this.config("verse", { extends: QuoteNode });
	}

	createDOM(config: EditorConfig) {
		return styledBlock(config, "div", "verse");
	}
}

/** A boxed aside. */
export class CalloutNode extends QuoteNode {
	$config() {
		return this.config("callout", { extends: QuoteNode });
	}

	createDOM(config: EditorConfig) {
		return styledBlock(config, "aside", "callout");
	}
}

/** A centered ⁂ between scenes. Drawn with CSS so it flows like a line of text. */
export class SceneBreakNode extends DecoratorNode<null> {
	$config() {
		return this.config("scene-break", { extends: DecoratorNode });
	}

	createDOM(config: EditorConfig) {
		return styledBlock(config, "div", "sceneBreak");
	}

	updateDOM() {
		return false;
	}

	isInline() {
		return false;
	}

	getTextContent() {
		return "\n\n";
	}

	decorate() {
		return null;
	}
}

/** Ends the current page. The paged editor sizes it to fill the page's remainder. */
export class PageBreakNode extends DecoratorNode<null> {
	$config() {
		return this.config("page-break", { extends: DecoratorNode });
	}

	createDOM(config: EditorConfig) {
		const element = styledBlock(config, "div", "pageBreak");
		element.dataset.pageBreak = "";
		return element;
	}

	updateDOM() {
		return false;
	}

	isInline() {
		return false;
	}

	getTextContent() {
		return "\n\n";
	}

	decorate() {
		return null;
	}
}

export const $createEpigraphNode = () => $create(EpigraphNode);
export const $createVerseNode = () => $create(VerseNode);
export const $createCalloutNode = () => $create(CalloutNode);
export const $createSceneBreakNode = () => $create(SceneBreakNode);
export const $createPageBreakNode = () => $create(PageBreakNode);

export const $isEpigraphNode = (node: LexicalNode | null | undefined) =>
	node instanceof EpigraphNode;
export const $isVerseNode = (node: LexicalNode | null | undefined) =>
	node instanceof VerseNode;
export const $isCalloutNode = (node: LexicalNode | null | undefined) =>
	node instanceof CalloutNode;
export const $isSceneBreakNode = (node: LexicalNode | null | undefined) =>
	node instanceof SceneBreakNode;

/** Keeps line breaks inside verse; a second Enter on an empty line exits. */
export const registerVerseLines = (editor: LexicalEditor) =>
	editor.registerCommand(
		KEY_ENTER_COMMAND,
		(event) => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection) || !selection.isCollapsed())
				return false;
			const block = selection.anchor.getNode().getTopLevelElement();
			if (!(block instanceof VerseNode) || event?.shiftKey) return false;

			event?.preventDefault();
			const atEmptyLastLine =
				selection.anchor.type === "element" &&
				selection.anchor.key === block.getKey() &&
				selection.anchor.offset === block.getChildrenSize() &&
				$isLineBreakNode(block.getLastChild());
			if (atEmptyLastLine) {
				block.getLastChild()?.remove();
				const paragraph = $createParagraphNode();
				block.insertAfter(paragraph);
				paragraph.select();
			} else {
				selection.insertLineBreak();
			}
			return true;
		},
		COMMAND_PRIORITY_LOW,
	);

// "# " and "## " make a section heading and "### " a subheading; the editor
// has no larger heading level.
const HEADING: ElementTransformer = {
	dependencies: [HeadingNode],
	export: () => null,
	regExp: /^(#{1,3})\s/,
	replace: (parent, children, match) => {
		const heading = $createHeadingNode(match[1].length === 3 ? "h3" : "h2");
		heading.append(...children);
		parent.replace(heading);
		heading.select(0, 0);
	},
	type: "element",
};

const SCENE_BREAK: ElementTransformer = {
	dependencies: [SceneBreakNode],
	export: (node) => ($isSceneBreakNode(node) ? "***" : null),
	regExp: /^(\*\*\*|---|⁂)\s?$/,
	replace: (parent, _children, _match, isImport) => {
		const sceneBreak = $createSceneBreakNode();
		if (isImport || parent.getNextSibling() !== null)
			parent.replace(sceneBreak);
		else parent.insertBefore(sceneBreak);
		sceneBreak.selectNext();
	},
	type: "element",
};

export const markdownShortcuts: Array<
	| ElementTransformer
	| MultilineElementTransformer
	| TextFormatTransformer
	| TextMatchTransformer
> = [
	HEADING,
	QUOTE,
	UNORDERED_LIST,
	ORDERED_LIST,
	SCENE_BREAK,
	CODE,
	INLINE_CODE,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	HIGHLIGHT,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	STRIKETHROUGH,
	LINK,
];
