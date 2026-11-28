import {
	$create,
	booleanValue,
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
	missing: withField(booleanValue(false), { field: "__missing" }),
});

/** A link to a note. The title is refreshed from the target when a note opens. */
export class WikiLinkNode extends TextNode {
	__noteId = 0;
	__title = "";
	__missing = false;

	$config() {
		return this.config("wiki-link", { extends: TextNode, json: schema });
	}

	createDOM(config: EditorConfig) {
		const element = super.createDOM(config);
		element.classList.add("wiki-link");
		element.dataset.noteId = String(this.__noteId);
		if (this.__missing) element.dataset.missing = "true";
		return element;
	}

	updateDOM(previous: TextNode, element: HTMLElement, config: EditorConfig) {
		if (
			previous instanceof WikiLinkNode &&
			(previous.__missing !== this.__missing ||
				previous.__noteId !== this.__noteId)
		)
			return true;
		return super.updateDOM(previous as this, element, config);
	}

	getNoteId() {
		return this.__noteId;
	}

	getTitle() {
		return this.__title;
	}

	getMissing() {
		return this.__missing;
	}

	setTitle(title: string) {
		const self = this.getWritable();
		self.__title = title;
		self.setTextContent(title);
		return self;
	}

	setMissing(missing: boolean) {
		const self = this.getWritable();
		self.__missing = missing;
		return self;
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
