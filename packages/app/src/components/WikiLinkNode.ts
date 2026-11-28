import {
	$create,
	type EditorConfig,
	nodeSchema,
	numberValue,
	stringValue,
	TextNode,
	withField,
} from "lexical";

const schema = nodeSchema<WikiLinkNode>()({
	noteId: withField(numberValue(), { field: "__noteId" }),
	title: withField(stringValue(), { field: "__title" }),
});

export class WikiLinkNode extends TextNode {
	__noteId = 0;
	__title = "";

	$config() {
		return this.config("wiki-link", { extends: TextNode, json: schema });
	}

	createDOM(config: EditorConfig) {
		const element = super.createDOM(config);
		element.classList.add("wiki-link");
		element.dataset.noteId = String(this.__noteId);
		return element;
	}

	isTextEntity() {
		return true;
	}
}

export const $createWikiLinkNode = (noteId: number, title: string) => {
	const node = $create(WikiLinkNode);
	node.__noteId = noteId;
	node.__title = title;
	return node.setTextContent(title).setMode("token");
};
