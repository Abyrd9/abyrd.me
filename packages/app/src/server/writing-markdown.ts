import { CodeHighlightNode, CodeNode } from "@lexical/code-core";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	type ElementTransformer,
	HEADING,
	type MultilineElementTransformer,
	type TextMatchTransformer,
	TRANSFORMERS,
	type Transformer,
} from "@lexical/markdown";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
	$createLineBreakNode,
	$createParagraphNode,
	$getRoot,
	$isElementNode,
	$isTextNode,
	createEditor,
	type LexicalNode,
	type TextFormatType,
} from "lexical";
import {
	$createFootnoteNode,
	FootnoteNode,
} from "#/components/WritingFootnotes";
import { $createImageNode, ImageNode } from "#/components/WritingImage";
import {
	$createCalloutNode,
	$createEpigraphNode,
	$createPageBreakNode,
	$createSceneBreakNode,
	$createVerseNode,
	CalloutNode,
	EpigraphNode,
	PageBreakNode,
	SceneBreakNode,
	VerseNode,
} from "#/components/writing-nodes";

const nodes = [
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
];

const editorForMarkdown = () =>
	createEditor({
		nodes,
		onError: (error) => {
			throw error;
		},
	});

const heading: ElementTransformer = {
	...HEADING,
	regExp: /^(#{1,})\s/,
	export: (node, children) =>
		node instanceof HeadingNode
			? `${node.getTag() === "h3" ? "###" : "##"} ${children(node)}`
			: null,
	replace: (parent, children, match) => {
		parent.replace(
			$createHeadingNode(match[1].length < 3 ? "h2" : "h3").append(...children),
		);
	},
};

const breaks: ElementTransformer = {
	type: "element",
	dependencies: [SceneBreakNode, PageBreakNode],
	regExp: /^(?:\*\*\*|---|⁂|<!-- page break -->)\s*$/,
	export: (node) =>
		node instanceof SceneBreakNode
			? "***"
			: node instanceof PageBreakNode
				? "<!-- page break -->"
				: null,
	replace: (parent, _children, match) => {
		parent.replace(
			match[0].startsWith("<!--")
				? $createPageBreakNode()
				: $createSceneBreakNode(),
		);
	},
};

const styledQuote: MultilineElementTransformer = {
	type: "multiline-element",
	dependencies: [EpigraphNode, VerseNode, CalloutNode],
	regExpStart: /^> \[!(epigraph|verse|callout)\]\s*$/,
	export: (node, children) => {
		const kind =
			node instanceof EpigraphNode
				? "epigraph"
				: node instanceof VerseNode
					? "verse"
					: node instanceof CalloutNode
						? "callout"
						: null;
		return kind && $isElementNode(node)
			? `> [!${kind}]\n${children(node)
					.split("\n")
					.map((line) => `> ${line}`)
					.join("\n")}`
			: null;
	},
	handleImportAfterStartMatch: ({
		lines,
		startLineIndex,
		startMatch,
		rootNode,
	}) => {
		const block =
			startMatch[1] === "epigraph"
				? $createEpigraphNode()
				: startMatch[1] === "verse"
					? $createVerseNode()
					: $createCalloutNode();
		rootNode.append(block);
		let end = startLineIndex;
		while (end + 1 < lines.length && /^>(?: |$)/.test(lines[end + 1])) {
			end++;
			if (end > startLineIndex + 1) block.append($createLineBreakNode());
			const paragraph = $createParagraphNode();
			$convertFromMarkdownString(
				lines[end].replace(/^> ?/, ""),
				inlineTransformers,
				paragraph,
			);
			for (const child of paragraph.getChildren()) {
				if ($isElementNode(child)) block.append(...child.getChildren());
				else block.append(child);
			}
		}
		return [true, end];
	},
	replace: () => false,
};

const htmlFormat = (
	tag: string,
	format: TextFormatType,
): TextMatchTransformer => ({
	type: "text-match",
	dependencies: [],
	regExp: new RegExp(`<${tag}>(.+?)</${tag}>`),
	importRegExp: new RegExp(`<${tag}>(.+?)</${tag}>`),
	export: (node, _children, formats) => {
		if (!$isTextNode(node) || !node.hasFormat(format)) return null;
		let text = formats(node, node.getTextContent());
		if (node.hasFormat("superscript")) text = `<sup>${text}</sup>`;
		if (node.hasFormat("underline")) text = `<u>${text}</u>`;
		return text;
	},
	replace: (node, match) => {
		const container = $createParagraphNode();
		$convertFromMarkdownString(match[1], inlineTransformers, container);
		for (const paragraph of container.getChildren()) {
			const children = $isElementNode(paragraph)
				? paragraph.getChildren()
				: [paragraph];
			for (const child of children) {
				if ($isTextNode(child))
					child
						.setFormat(child.getFormat() | node.getFormat())
						.toggleFormat(format);
				node.insertBefore(child);
			}
		}
		node.remove();
	},
});

const image: TextMatchTransformer = {
	type: "text-match",
	dependencies: [ImageNode],
	regExp: /!\[([^\]]*)\]\(([^)]+)\)/,
	importRegExp: /!\[([^\]]*)\]\(([^)]+)\)/,
	export: (node) =>
		node instanceof ImageNode ? `![${node.__alt}](${node.__src})` : null,
	replace: (node, match) => {
		node.replace($createImageNode(match[2], match[1]));
	},
};

const footnote: TextMatchTransformer = {
	type: "text-match",
	dependencies: [FootnoteNode],
	regExp: /\^\[((?:\\.|[^\]\\])*)\]/,
	importRegExp: /\^\[((?:\\.|[^\]\\])*)\]/,
	export: (node) =>
		node instanceof FootnoteNode
			? `^[${node.__note.replace(/[\\\]]/g, "\\$&")}]`
			: null,
	replace: (node, match) => {
		node.replace(
			$createFootnoteNode().setNote(match[1].replace(/\\(.)/g, "$1")),
		);
	},
};

const inlineTransformers: Transformer[] = [
	image,
	footnote,
	htmlFormat("u", "underline"),
	htmlFormat("sup", "superscript"),
	...TRANSFORMERS.filter(
		(item) => item.type === "text-format" || item.type === "text-match",
	),
];
const transformers: Transformer[] = [
	styledQuote,
	breaks,
	heading,
	...TRANSFORMERS.filter(
		(item) =>
			item.type !== "text-format" &&
			item.type !== "text-match" &&
			item !== HEADING,
	),
	...inlineTransformers,
];

// Preserve future node text even when this server does not know its class.
const normalizeNode = (value: unknown): unknown => {
	if (!value || typeof value !== "object") return value;
	if (Array.isArray(value)) return value.map(normalizeNode);
	if (!("type" in value))
		return Object.fromEntries(
			Object.entries(value).map(([key, child]) => [key, normalizeNode(child)]),
		);
	const known = [
		"root",
		"paragraph",
		"text",
		"linebreak",
		"tab",
		...nodes.map((node) => node.getType()),
	];
	const result = Object.fromEntries(
		Object.entries(value).map(([key, child]) => [key, normalizeNode(child)]),
	);
	if (typeof value.type === "string" && !known.includes(value.type)) {
		return "children" in value
			? { ...result, type: "paragraph" }
			: {
					...result,
					type: "text",
					text:
						"text" in value && typeof value.text === "string" ? value.text : "",
				};
	}
	return result;
};

const readContent = <T>(content: string, read: () => T) =>
	editorForMarkdown()
		.parseEditorState(JSON.stringify(normalizeNode(JSON.parse(content))))
		.read(read);

/** Saved editor state to Markdown, without needing a browser DOM. */
export const toMarkdown = (content: string | null) =>
	content === null
		? ""
		: readContent(content, () => $convertToMarkdownString(transformers));

/** Markdown to the same serialized node types used by the writing editors. */
export const fromMarkdown = (markdown: string) => {
	const editor = editorForMarkdown();
	editor.update(
		() => {
			$convertFromMarkdownString(markdown, transformers);
		},
		{ discrete: true },
	);
	return JSON.stringify(editor.getEditorState().toJSON());
};

export const contentWordCount = (content: string | null) =>
	content === null
		? 0
		: readContent(
				content,
				() => $getRoot().getTextContent().split(/\s+/).filter(Boolean).length,
			);

export const isEmptyContent = (content: string | null) =>
	content === null ||
	readContent(content, () => {
		const meaningful = (node: LexicalNode): boolean => {
			if (
				node instanceof ImageNode ||
				node instanceof SceneBreakNode ||
				node instanceof PageBreakNode
			)
				return true;
			if ($isElementNode(node)) return node.getChildren().some(meaningful);
			return node.getTextContent().trim().length > 0;
		};
		return !meaningful($getRoot());
	});
