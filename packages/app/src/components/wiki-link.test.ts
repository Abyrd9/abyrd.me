import { expect, test } from "bun:test";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	createEditor,
} from "lexical";
import { extractNoteLinks } from "../server/note-links";
import { $createWikiLinkNode, WikiLinkNode } from "./WikiLinkNode";

test("wiki links retain their destination and title through saved editor state", () => {
	const editor = createEditor({ nodes: [WikiLinkNode] });
	editor.update(
		() => {
			$getRoot().append(
				$createParagraphNode().append(
					$createTextNode("See "),
					$createWikiLinkNode(42, "The garden"),
					$createTextNode(" for details."),
				),
			);
		},
		{ discrete: true },
	);
	const saved = JSON.stringify(editor.getEditorState().toJSON());
	const restored = createEditor({ nodes: [WikiLinkNode] });
	restored.setEditorState(restored.parseEditorState(saved));
	const roundTrip = JSON.stringify(restored.getEditorState().toJSON());
	expect(roundTrip).toBe(saved);
	expect(JSON.parse(roundTrip).root.children[0].children[1]).toMatchObject({
		type: "wiki-link",
		noteId: 42,
		title: "The garden",
	});
	expect(extractNoteLinks(roundTrip)).toEqual([
		{ targetNoteId: 42, context: "See The garden for details." },
	]);
});
