// Reads an editor's text as plain-text blocks (paragraphs, headings, list
// items), with a map back to the text nodes, so features can find passages
// and draw over them. The server reads saved chapters the same way in
// chapterBlockTexts; keep the two in step.
import { $isCodeNode } from "@lexical/code-core";
import {
	$getRoot,
	$isElementNode,
	$isLineBreakNode,
	$isTextNode,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
} from "lexical";

/** A run of text inside a block, and where it sits in the block's text. */
export type Piece = { key: string; start: number; length: number };

export type Block = { text: string; pieces: Piece[] };

/** Splits the document into blocks of plain text, skipping code. */
export const $readBlocks = () => {
	const blocks: Block[] = [];
	const collect = (element: ElementNode) => {
		if ($isCodeNode(element)) return;
		const children = element.getChildren();
		const nested = children.filter(
			(child): child is ElementNode =>
				$isElementNode(child) && !child.isInline(),
		);
		if (nested.length) {
			for (const child of nested) collect(child);
			return;
		}
		const block: Block = { text: "", pieces: [] };
		const walk = (node: LexicalNode) => {
			if ($isTextNode(node)) {
				const text = node.getTextContent();
				block.pieces.push({
					key: node.getKey(),
					start: block.text.length,
					length: text.length,
				});
				block.text += text;
			} else if ($isLineBreakNode(node)) block.text += "\n";
			else if ($isElementNode(node))
				for (const child of node.getChildren()) walk(child);
		};
		for (const child of children) walk(child);
		if (block.text.trim()) blocks.push(block);
	};
	collect($getRoot());
	return blocks;
};

/** Finds the text node and offset for a position in a block's text. */
export const locate = (block: Block, position: number, atEnd: boolean) => {
	const piece = block.pieces.find((p) =>
		atEnd
			? position > p.start && position <= p.start + p.length
			: position >= p.start && position < p.start + p.length,
	);
	return piece && { key: piece.key, offset: position - piece.start };
};

export const domText = (editor: LexicalEditor, key: string) => {
	let node: Node | null = editor.getElementByKey(key);
	while (node?.firstChild) node = node.firstChild;
	return node?.nodeType === Node.TEXT_NODE ? node : null;
};

/** A DOM range over block text, for drawing highlights; null if not on screen. */
export const blockRange = (
	editor: LexicalEditor,
	block: Block,
	start: number,
	end: number,
) => {
	const anchor = locate(block, start, false);
	const focus = locate(block, end, true);
	if (!anchor || !focus) return null;
	const startText = domText(editor, anchor.key);
	const endText = domText(editor, focus.key);
	if (!startText || !endText) return null;
	const range = new Range();
	try {
		range.setStart(startText, anchor.offset);
		range.setEnd(endText, focus.offset);
	} catch {
		return null;
	}
	return { range, anchor, focus };
};
