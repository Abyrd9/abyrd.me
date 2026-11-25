import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $dfs } from "@lexical/utils";
import {
	$create,
	$getNodeByKey,
	DecoratorNode,
	type LexicalEditor,
	type NodeKey,
	nodeSchema,
	stringValue,
	withField,
} from "lexical";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const footnoteSchema = nodeSchema<FootnoteNode>()({
	note: withField(stringValue(), { field: "__note" }),
});

/**
 * A numbered marker in the text. Numbers come from a CSS counter, so they
 * follow document order without being stored; the note text lives on the node
 * and is listed at the end of the chapter.
 */
export class FootnoteNode extends DecoratorNode<ReactNode> {
	__note = "";

	$config() {
		return this.config("footnote", {
			extends: DecoratorNode,
			json: footnoteSchema,
		});
	}

	createDOM() {
		const element = document.createElement("sup");
		element.className = "writing-footnote-ref";
		return element;
	}

	updateDOM() {
		return false;
	}

	isInline() {
		return true;
	}

	getTextContent() {
		return "";
	}

	setNote(note: string) {
		const self = this.getWritable();
		self.__note = note;
		return self;
	}

	decorate() {
		return <FootnoteMarker nodeKey={this.getKey()} note={this.__note} />;
	}
}

export const $createFootnoteNode = () => $create(FootnoteNode);

const updateNote = (editor: LexicalEditor, key: NodeKey, note: string) =>
	editor.update(() => {
		const node = $getNodeByKey(key);
		if (!(node instanceof FootnoteNode)) return;
		// An empty note means the footnote was abandoned, so it goes away.
		if (note.trim()) node.setNote(note.trim());
		else node.remove();
	});

const FootnoteMarker = ({
	nodeKey,
	note,
}: {
	nodeKey: NodeKey;
	note: string;
}) => {
	const [editor] = useLexicalComposerContext();
	const marker = useRef<HTMLButtonElement>(null);
	// A brand-new footnote opens straight into its note.
	const [open, setOpen] = useState(note === "");
	const [draft, setDraft] = useState(note);
	const [position, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

	// Placed against the viewport and moved with the marker as anything scrolls.
	useEffect(() => {
		if (!open) return;
		const place = () => {
			const rect = marker.current?.getBoundingClientRect();
			if (rect) setPosition({ top: rect.bottom + 6, left: rect.left });
		};
		place();
		window.addEventListener("scroll", place, { capture: true, passive: true });
		return () => window.removeEventListener("scroll", place, { capture: true });
	}, [open]);

	const close = () => {
		setOpen(false);
		updateNote(editor, nodeKey, draft);
		editor.update(() => $getNodeByKey(nodeKey)?.selectNext());
		editor.focus();
	};

	return (
		<>
			<button
				aria-label={note ? `Footnote: ${note}` : "New footnote"}
				className="writing-footnote-button"
				onClick={() => {
					setDraft(note);
					setOpen(true);
				}}
				ref={marker}
				title={note}
				type="button"
			/>
			{open && position
				? createPortal(
						<div
							className="fixed z-50 w-72 rounded-xl border border-stone-200 bg-white p-2 font-sans text-sm shadow-xl dark:border-stone-700"
							style={position}
						>
							<label
								className="block px-1 pb-1 text-xs text-stone-500"
								htmlFor={`footnote-${nodeKey}`}
							>
								Footnote
							</label>
							<textarea
								className="min-h-20 w-full resize-y rounded-md border border-stone-200 bg-transparent px-2 py-1.5 font-book text-stone-900 outline-none focus:border-stone-400 dark:border-stone-700 dark:text-stone-100"
								id={`footnote-${nodeKey}`}
								onBlur={close}
								onChange={(event) => setDraft(event.target.value)}
								onKeyDown={(event) => {
									if (
										event.key === "Escape" ||
										(event.key === "Enter" && !event.shiftKey)
									) {
										event.preventDefault();
										event.currentTarget.blur();
									}
								}}
								placeholder="Write the note. Enter to finish."
								ref={(element) => element?.focus()}
								value={draft}
							/>
							<p className="px-1 pt-1 text-xs text-stone-400">
								Leave it empty to remove the footnote.
							</p>
						</div>,
						document.body,
					)
				: null}
		</>
	);
};

/** The chapter's notes, in the order their markers appear. */
export const FootnotesList = () => {
	const [editor] = useLexicalComposerContext();
	const [notes, setNotes] = useState<Array<{ key: NodeKey; note: string }>>([]);

	useEffect(
		() =>
			editor.registerUpdateListener(({ editorState }) =>
				editorState.read(() => {
					const next = $dfs()
						.map(({ node }) => node)
						.filter((node) => node instanceof FootnoteNode)
						.map((node) => ({ key: node.getKey(), note: node.__note }));
					setNotes((current) =>
						JSON.stringify(current) === JSON.stringify(next) ? current : next,
					);
				}),
			),
		[editor],
	);

	if (!notes.length) return null;
	return (
		<ol aria-label="Footnotes" className="writing-footnotes">
			{notes.map(({ key, note }) => (
				<li key={key}>
					{note || <em className="text-stone-400">Empty note</em>}
				</li>
			))}
		</ol>
	);
};
