import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { type ReactNode, useState } from "react";
import { FootnotesList } from "#/components/WritingFootnotes";
import {
	createWritingExtension,
	WritingEditorPlugins,
} from "#/components/writing-editor-setup";

/** A note: the book's paper and tools on one endless sheet, with no pages. */
export const NoteEditor = ({
	initialContent,
	onChange,
	autoFocus,
	header,
}: {
	/** Serialized Lexical state. Read once when the editor mounts. */
	initialContent: string | null;
	onChange: (content: string) => void;
	autoFocus: boolean;
	/** Shown at the top of the sheet, above the text (the note's title). */
	header: ReactNode;
}) => {
	const [extension] = useState(() =>
		createWritingExtension("NoteWriting", initialContent),
	);

	return (
		<LexicalExtensionComposer extension={extension} contentEditable={null}>
			<div
				// No top padding: the note's control strip sits on the top edge.
				className="writing-paper mx-auto min-h-[calc(100dvh-6.5rem)] w-full max-w-[40rem] bg-white px-5 pb-12 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:px-10"
				// Notes have no page to fit, so images cap at most of the screen.
				style={{ fontSize: "11.5pt", ["--page-text-height" as string]: "70vh" }}
			>
				{header}
				<div className="relative mt-6">
					<RichTextPlugin
						contentEditable={
							<ContentEditable
								aria-label="Note text"
								className="min-h-[40vh] outline-none"
								spellCheck
							/>
						}
						placeholder={
							<p className="pointer-events-none absolute top-0 left-0 text-stone-400">
								Think it through here…
							</p>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<FootnotesList />
				</div>
			</div>
			<WritingEditorPlugins
				autoFocus={autoFocus}
				onChange={(content) => onChange(content)}
				paged={false}
			/>
		</LexicalExtensionComposer>
	);
};
