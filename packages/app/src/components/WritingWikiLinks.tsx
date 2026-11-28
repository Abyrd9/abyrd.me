import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createTextNode, $getNodeByKey, $isTextNode } from "lexical";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { $createWikiLinkNode } from "#/components/WikiLinkNode";
import {
	createWritingNote,
	searchWritingNotes,
} from "#/server/writing-notes-functions";

export type WikiLinkContext = {
	currentWritingId: number | null;
	currentChapterId: number | null;
	currentNoteId: number | null;
	currentParentId?: number | null;
	onOpenNote: (id: number) => void;
};

class NoteOption extends MenuOption {
	constructor(
		public noteId: number | null,
		public title: string,
	) {
		super(noteId === null ? "create" : String(noteId));
	}
}

export const WritingWikiLinks = ({
	currentWritingId,
	currentChapterId,
	currentNoteId,
	onOpenNote,
}: WikiLinkContext) => {
	const [editor] = useLexicalComposerContext();
	const [query, setQuery] = useState<string | null>(null);
	const [results, setResults] = useState<
		Awaited<ReturnType<typeof searchWritingNotes>>
	>([]);
	const [error, setError] = useState(false);
	const creating = useRef(false);

	useEffect(() => {
		let active = true;
		setResults([]);
		if (query === null || currentWritingId === null) return;
		const timer = window.setTimeout(() => {
			void searchWritingNotes({ data: { query, currentWritingId } })
				.then((notes) => {
					if (active) setResults(notes);
				})
				.catch(() => {
					if (active) setError(true);
				});
		}, 150);
		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [query, currentWritingId]);

	useEffect(() => {
		const click = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const link = target.closest<HTMLElement>(".wiki-link");
			if (!link || !editor.getRootElement()?.contains(link)) return;
			event.preventDefault();
			onOpenNote(Number(link.dataset.noteId));
		};
		return editor.registerRootListener((root, previous) => {
			previous?.removeEventListener("click", click);
			root?.addEventListener("click", click);
		});
	}, [editor, onOpenNote]);

	const options = [
		...results.map(
			(note) => new NoteOption(note.id, note.title.trim() || "Untitled"),
		),
		new NoteOption(null, query?.trim() || "Untitled"),
	];

	return (
		<LexicalTypeaheadMenuPlugin
			anchorClassName="z-50"
			onQueryChange={(value) => {
				setQuery(value);
				setError(false);
			}}
			options={options}
			triggerFn={(text) => {
				if (currentWritingId === null) return null;
				const match = /\[\[([^[\]\n]{0,300})$/.exec(text);
				return match
					? {
							leadOffset: match.index,
							matchingString: match[1],
							replaceableString: match[0],
						}
					: null;
			}}
			onSelectOption={(option, text, close) => {
				if (!text || creating.current) return;
				const key = text.getKey();
				const original = text.getTextContent();
				const insert = (id: number, title: string) =>
					editor.update(
						() => {
							const target = $getNodeByKey(key);
							if (!$isTextNode(target) || target.getTextContent() !== original)
								return;
							const link = $createWikiLinkNode(id, title);
							target.replace(link);
							const space = $createTextNode(" ");
							link.insertAfter(space);
							space.select();
						},
						{ discrete: true },
					);
				if (option.noteId !== null) {
					insert(option.noteId, option.title);
					close();
					return;
				}
				creating.current = true;
				// Keep the split query node from merging while the request is pending.
				if (!text.isUnmergeable()) text.toggleUnmergeable();
				void createWritingNote({
					data: {
						writingId: currentWritingId,
						chapterId: currentChapterId,
						parentId: currentNoteId,
						title: option.title,
					},
				})
					.then((note) => {
						insert(note.id, note.title);
						close();
						onOpenNote(note.id);
					})
					.catch(() => {
						editor.update(() => {
							const target = $getNodeByKey(key);
							if ($isTextNode(target) && target.isUnmergeable())
								target.toggleUnmergeable();
						});
						setError(true);
					})
					.finally(() => {
						creating.current = false;
					});
			}}
			menuRenderFn={(
				anchor,
				{ selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
			) =>
				anchor.current
					? createPortal(
							<div className="z-50 max-h-72 w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 font-sans text-sm text-stone-900 shadow-xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
								{options.map((option, index) => (
									<button
										key={option.key}
										id={`typeahead-item-${index}`}
										role="option"
										aria-selected={selectedIndex === index}
										type="button"
										ref={option.setRefElement}
										className={`block w-full rounded-lg px-3 py-2 text-left ${selectedIndex === index ? "bg-stone-100 dark:bg-stone-800" : ""}`}
										onMouseEnter={() => setHighlightedIndex(index)}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => selectOptionAndCleanUp(option)}
									>
										{option.noteId === null
											? `Create note '${option.title}'`
											: option.title}
									</button>
								))}
								{error ? (
									<p className="px-3 py-2 text-red-600" role="alert">
										Could not load or create notes. Try again.
									</p>
								) : null}
							</div>,
							anchor.current,
						)
					: null
			}
		/>
	);
};
