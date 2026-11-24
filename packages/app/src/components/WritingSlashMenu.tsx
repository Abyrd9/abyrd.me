import { $createCodeNode } from "@lexical/code-core";
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
	$getSelection,
	$insertNodes,
	$isRangeSelection,
	$isTextNode,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
} from "lexical";
import { useState } from "react";
import { createPortal } from "react-dom";
import { $createFootnoteNode } from "#/components/WritingFootnotes";
import { OPEN_IMAGE_PICKER_COMMAND } from "#/components/WritingImage";
import {
	$createCalloutNode,
	$createEpigraphNode,
	$createPageBreakNode,
	$createSceneBreakNode,
	$createVerseNode,
} from "#/components/writing-nodes";

class BlockOption extends MenuOption {
	constructor(
		readonly title: string,
		readonly description: string,
		readonly glyph: string,
		readonly keywords: string[],
		readonly run: (editor: LexicalEditor) => void,
	) {
		super(title);
	}
}

const turnInto = (create: () => ElementNode) => (editor: LexicalEditor) =>
	editor.update(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) $setBlocksType(selection, create);
	});

const insert = (create: () => LexicalNode) => (editor: LexicalEditor) =>
	editor.update(() => {
		$insertNodeToNearestRoot(create());
	});

const options = [
	new BlockOption(
		"Heading",
		"A section heading",
		"H2",
		["h2", "title", "section"],
		turnInto(() => $createHeadingNode("h2")),
	),
	new BlockOption(
		"Subheading",
		"A smaller heading",
		"H3",
		["h3", "subtitle"],
		turnInto(() => $createHeadingNode("h3")),
	),
	new BlockOption(
		"Quote",
		"An indented quotation",
		"“",
		["blockquote", "citation"],
		turnInto($createQuoteNode),
	),
	new BlockOption(
		"Bulleted list",
		"A simple list",
		"•",
		["ul", "unordered", "bullets"],
		(editor) =>
			editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
	),
	new BlockOption(
		"Numbered list",
		"A list with numbers",
		"1.",
		["ol", "ordered"],
		(editor) => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
	),
	new BlockOption(
		"Scene break",
		"A ⁂ between scenes",
		"⁂",
		["divider", "separator", "hr", "section break"],
		insert($createSceneBreakNode),
	),
	new BlockOption(
		"Page break",
		"Start the next page",
		"↧",
		["new page"],
		insert($createPageBreakNode),
	),
	new BlockOption(
		"Epigraph",
		"An opening quotation, set right",
		"❝",
		["opening", "chapter quote"],
		turnInto($createEpigraphNode),
	),
	new BlockOption(
		"Verse",
		"Poetry or lyrics, line by line",
		"≋",
		["poem", "poetry", "lyrics", "song"],
		turnInto($createVerseNode),
	),
	new BlockOption(
		"Callout",
		"A boxed aside",
		"▢",
		["aside", "note", "box", "tip"],
		turnInto($createCalloutNode),
	),
	new BlockOption(
		"Image",
		"Upload a picture",
		"▣",
		["picture", "photo", "img", "upload"],
		(editor) => editor.dispatchCommand(OPEN_IMAGE_PICKER_COMMAND, undefined),
	),
	new BlockOption(
		"Footnote",
		"A numbered note at the chapter's end",
		"¹",
		["note", "citation", "reference", "endnote"],
		(editor) =>
			editor.update(() => {
				// The menu needs a space before "/", but the marker belongs
				// against the word it annotates.
				const selection = $getSelection();
				const anchor = $isRangeSelection(selection) ? selection.anchor : null;
				const text = anchor?.getNode();
				if (anchor && $isTextNode(text)) {
					const before = text.getTextContent().slice(0, anchor.offset);
					if (before.endsWith(" "))
						text.spliceText(anchor.offset - 1, 1, "", true);
				}
				$insertNodes([$createFootnoteNode()]);
			}),
	),
	new BlockOption(
		"Code block",
		"Monospace code",
		"{ }",
		["code", "pre", "snippet"],
		turnInto(() => $createCodeNode()),
	),
];

/** Typing "/" opens a menu of blocks; typing more filters it. */
export const WritingSlashMenu = () => {
	const [editor] = useLexicalComposerContext();
	const [query, setQuery] = useState<string | null>(null);
	const triggerFn = useBasicTypeaheadTriggerMatch("/", {
		allowWhitespace: true,
		minLength: 0,
	});

	const search = query?.toLowerCase() ?? "";
	const matches = options.filter(
		(option) =>
			option.title.toLowerCase().includes(search) ||
			option.keywords.some((keyword) => keyword.includes(search)),
	);

	return (
		<LexicalTypeaheadMenuPlugin<BlockOption>
			menuRenderFn={(
				anchor,
				{ selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
			) =>
				anchor.current && matches.length
					? createPortal(
							<div
								className="writing-slash-menu mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 font-sans text-sm shadow-xl dark:border-stone-700"
								role="listbox"
								aria-label="Insert a block"
							>
								{matches.map((option, index) => (
									// biome-ignore lint/a11y/useKeyWithClickEvents: the typeahead plugin handles arrow keys and Enter from the editor.
									<div
										aria-selected={selectedIndex === index}
										className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${selectedIndex === index ? "bg-stone-100 dark:bg-stone-800" : ""}`}
										id={`slash-option-${option.key}`}
										key={option.key}
										onClick={() => selectOptionAndCleanUp(option)}
										onMouseEnter={() => setHighlightedIndex(index)}
										ref={option.setRefElement}
										role="option"
										tabIndex={-1}
									>
										<span
											aria-hidden="true"
											className="grid size-8 shrink-0 place-items-center rounded-md border border-stone-200 font-serif text-stone-600 dark:border-stone-700 dark:text-stone-300"
										>
											{option.glyph}
										</span>
										<span className="min-w-0">
											<span className="block text-stone-900 dark:text-stone-100">
												{option.title}
											</span>
											<span className="block truncate text-xs text-stone-500">
												{option.description}
											</span>
										</span>
									</div>
								))}
							</div>,
							anchor.current,
						)
					: null
			}
			onQueryChange={setQuery}
			onSelectOption={(option, textNode, closeMenu) => {
				editor.update(() => {
					textNode?.remove();
					option.run(editor);
				});
				closeMenu();
			}}
			options={matches}
			triggerFn={triggerFn}
		/>
	);
};
