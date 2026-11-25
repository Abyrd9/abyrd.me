import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, $isRangeSelection } from "lexical";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * The chapter's word count, or "12 of 1,234 words" while text is selected.
 * Drawn into a slot in the top bar so typing only re-renders this count.
 */
export const ChapterWordCount = ({ slot }: { slot: HTMLElement | null }) => {
	const [editor] = useLexicalComposerContext();
	const [counts, setCounts] = useState({ total: 0, selected: 0 });

	useEffect(() => {
		let frame = 0;
		const count = () => {
			cancelAnimationFrame(frame);
			// Once per frame at most, so long chapters don't slow typing.
			frame = requestAnimationFrame(() =>
				editor.getEditorState().read(() => {
					const selection = $getSelection();
					setCounts({
						total: countWords($getRoot().getTextContent()),
						selected:
							$isRangeSelection(selection) && !selection.isCollapsed()
								? countWords(selection.getTextContent())
								: 0,
					});
				}),
			);
		};
		count();
		const unregister = editor.registerUpdateListener(count);
		return () => {
			cancelAnimationFrame(frame);
			unregister();
		};
	}, [editor]);

	if (!slot) return null;
	const total = counts.total.toLocaleString();
	const unit = counts.total === 1 ? "word" : "words";
	return createPortal(
		counts.selected
			? `${counts.selected.toLocaleString()} of ${total} ${unit}`
			: `${total} ${unit}`,
		slot,
	);
};
