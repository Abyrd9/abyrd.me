import { describe, expect, test } from "bun:test";
import { CodeHighlightNode, CodeNode } from "@lexical/code-core";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $getRoot, createEditor } from "lexical";
import { FootnoteNode } from "#/components/WritingFootnotes";
import { ImageNode } from "#/components/WritingImage";
import {
	CalloutNode,
	EpigraphNode,
	PageBreakNode,
	SceneBreakNode,
	VerseNode,
} from "#/components/writing-nodes";
import {
	contentWordCount,
	fromMarkdown,
	isEmptyContent,
	toMarkdown,
} from "./writing-markdown";

const appEditor = () =>
	createEditor({
		nodes: [
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
		],
		onError: (error) => {
			throw error;
		},
	});

describe("writing Markdown", () => {
	for (const markdown of [
		"## Section\n\n### Subsection\n\nA paragraph.\n\nAnother paragraph.",
		"> A quote\n> another line",
		"- first\n    - nested\n- second",
		"1. first\n2. second",
		"```js\nconst x = 1;\n```",
		"[a link](https://example.com)",
		"**bold** *italic* ~~strike~~ `code` ==highlight== <u>underline</u> <sup>superscript</sup>",
		"> [!epigraph]\n> Opening words",
		"> [!verse]\n> First line\n> Second line",
		"> [!callout]\n> Aside",
		"***\n\n<!-- page break -->",
		"![a picture](https://example.com/image.png)",
		"Before^[a note] after.",
		"<u>**bold underline**</u> <u><sup>both</sup></u>",
	]) {
		test(`round-trips ${markdown}`, () => {
			const content = fromMarkdown(markdown);
			expect(() => appEditor().parseEditorState(content)).not.toThrow();
			const exported = toMarkdown(content);
			expect(toMarkdown(fromMarkdown(exported))).toBe(exported);
			expect(exported).toContain(markdown.split("\n")[0]);
		});
	}

	test("normalizes headings and scene breaks", () => {
		expect(toMarkdown(fromMarkdown("# Title"))).toBe("## Title");
		expect(toMarkdown(fromMarkdown("###### Title"))).toBe("### Title");
		for (const separator of ["---", "⁂"])
			expect(toMarkdown(fromMarkdown(separator))).toBe("***");
	});

	test("preserves verse line breaks and custom node types", () => {
		const content = fromMarkdown("> [!verse]\n> one\n> two");
		expect(content).toContain('"type":"verse"');
		expect(content).toContain('"type":"linebreak"');
		expect(toMarkdown(content)).toBe("> [!verse]\n> one\n> two");
	});

	test("imports formatting rather than retaining literal tags", () => {
		const content = fromMarkdown(
			"<u>under</u> <sup>up</sup> **bold** *italic* ~~strike~~ ==highlight== `code`",
		);
		appEditor()
			.parseEditorState(content)
			.read(() => {
				const text = $getRoot().getAllTextNodes();
				for (const [word, format] of [
					["under", "underline"],
					["up", "superscript"],
					["bold", "bold"],
					["italic", "italic"],
					["strike", "strikethrough"],
					["highlight", "highlight"],
					["code", "code"],
				] as const)
					expect(
						text
							.find((node) => node.getTextContent() === word)
							?.hasFormat(format),
					).toBe(true);
			});
	});

	test("counts exactly like the editor", () => {
		const content = fromMarkdown(
			"one **two**\n\nthree^[not counted]\n\n![alt](image.png)",
		);
		const text = appEditor()
			.parseEditorState(content)
			.read(() => $getRoot().getTextContent());
		expect(contentWordCount(content)).toBe(
			text.split(/\s+/).filter(Boolean).length,
		);
		expect(contentWordCount(content)).toBe(3);
		expect(contentWordCount(null)).toBe(0);
	});

	test("distinguishes empty text from meaningful decorators", () => {
		expect(toMarkdown(null)).toBe("");
		for (const content of [null, fromMarkdown(""), fromMarkdown("   ")])
			expect(isEmptyContent(content)).toBe(true);
		for (const markdown of [
			"word",
			"![alt](image.png)",
			"***",
			"<!-- page break -->",
		])
			expect(isEmptyContent(fromMarkdown(markdown))).toBe(false);
	});

	test("exports unknown node text", () => {
		const content = fromMarkdown("Retained words").replace(
			'"type":"paragraph"',
			'"type":"future-block"',
		);
		expect(toMarkdown(content)).toBe("Retained words");
	});
});
