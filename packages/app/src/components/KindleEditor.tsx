import { defineExtension } from "@lexical/extension";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	INSERT_UNORDERED_LIST_COMMAND,
	ListItemNode,
	ListNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
	$getSelection,
	FORMAT_TEXT_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/primitives/button";

const extension = defineExtension({
	name: "KindleNotes",
	namespace: "KindleNotes",
	nodes: () => [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
	theme: {
		text: { bold: "font-bold", italic: "italic" },
		list: { ul: "list-disc pl-6", ol: "list-decimal pl-6" },
		heading: { h2: "text-xl font-semibold" },
		link: "text-blue-700 underline",
	},
});

const EditorControls = () => {
	const [editor] = useLexicalComposerContext();
	const control =
		"inline-flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500";
	return (
		<div
			role="toolbar"
			aria-label="Text formatting"
			className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1"
		>
			<button
				className={control}
				aria-label="Bold"
				title="Bold"
				type="button"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
			>
				<span aria-hidden="true" className="text-base font-bold">
					B
				</span>
			</button>
			<button
				className={control}
				aria-label="Italic"
				title="Italic"
				type="button"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
			>
				<span aria-hidden="true" className="font-serif text-lg italic">
					I
				</span>
			</button>
			<span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />
			<button
				className={control}
				aria-label="Bulleted list"
				title="Bulleted list"
				type="button"
				onClick={() =>
					editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
				}
			>
				<svg
					aria-hidden="true"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<path d="M9 6h11M9 12h11M9 18h11" />
					<path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" />
				</svg>
			</button>
			<button
				className={control}
				aria-label="Heading"
				title="Heading"
				type="button"
				onClick={() =>
					editor.update(() =>
						$setBlocksType($getSelection(), () => $createHeadingNode("h2")),
					)
				}
			>
				<span aria-hidden="true" className="text-sm font-semibold">
					H<span className="text-xs">2</span>
				</span>
			</button>
			<button
				className={control}
				aria-label="Insert link"
				title="Insert link"
				type="button"
				onClick={() => {
					const value = prompt("Link URL (https, http, or mailto)");
					if (!value) return;
					try {
						const url = new URL(value);
						if (["https:", "http:", "mailto:"].includes(url.protocol))
							editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.href);
					} catch {
						alert(
							"Enter a valid URL starting with https://, http://, or mailto:.",
						);
					}
				}}
			>
				<svg
					aria-hidden="true"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M10 13a5 5 0 0 0 7.07 0l2-2A5 5 0 0 0 12 3.93l-1.15 1.15" />
					<path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.14-1.14" />
				</svg>
			</button>
			<span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />
			<button
				className={control}
				aria-label="Undo"
				title="Undo"
				type="button"
				onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
			>
				<svg
					aria-hidden="true"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M9 14 4 9l5-5" />
					<path d="M4 9h9a6 6 0 0 1 0 12h-2" />
				</svg>
			</button>
			<button
				className={control}
				aria-label="Redo"
				title="Redo"
				type="button"
				onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
			>
				<svg
					aria-hidden="true"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m15 14 5-5-5-5" />
					<path d="M20 9h-9a6 6 0 0 0 0 12h2" />
				</svg>
			</button>
		</div>
	);
};

const InitialContent = ({ content }: { content: string | null }) => {
	const [editor] = useLexicalComposerContext();
	useEffect(() => {
		if (content) editor.setEditorState(editor.parseEditorState(content));
	}, [editor, content]);
	return null;
};

export const KindleEditor = ({
	label,
	content,
	onSave,
	onDirtyChange,
	fullPage = false,
}: {
	label: string;
	content: string | null;
	onSave: (content: string, previous: string | null) => Promise<void>;
	onDirtyChange?: (dirty: boolean) => void;
	fullPage?: boolean;
}) => {
	const [initialContent] = useState(content);
	const [previous, setPrevious] = useState(content);
	const [draft, setDraft] = useState(content ?? "");
	const latestDraft = useRef(draft);
	const [isSaving, setIsSaving] = useState(false);
	const [status, setStatus] = useState("");
	useEffect(() => {
		if (!draft || draft === previous) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [draft, previous]);
	return (
		<div className="mt-4">
			<p className="mb-2 text-sm font-medium">{label}</p>
			<LexicalExtensionComposer extension={extension} contentEditable={null}>
				<div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-slate-500">
					<EditorControls />
					<RichTextPlugin
						contentEditable={
							<ContentEditable
								aria-label={label}
								className={
									fullPage
										? "min-h-[55vh] px-5 py-5 leading-relaxed outline-none sm:px-8"
										: "min-h-28 px-4 py-3 leading-relaxed outline-none"
								}
							/>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
				</div>
				<InitialContent content={initialContent} />
				<HistoryPlugin />
				<ListPlugin />
				<LinkPlugin
					validateUrl={(value) => {
						try {
							return ["https:", "http:", "mailto:"].includes(
								new URL(value).protocol,
							);
						} catch {
							return false;
						}
					}}
				/>
				<OnChangePlugin
					onChange={(state) => {
						const next = JSON.stringify(state.toJSON());
						latestDraft.current = next;
						setDraft(next);
						setStatus(next === previous ? "" : "Unsaved changes");
						onDirtyChange?.(next !== previous);
					}}
				/>
			</LexicalExtensionComposer>
			<div className="mt-2 flex items-center gap-3">
				<Button
					disabled={!draft || isSaving}
					type="button"
					onClick={() => {
						setIsSaving(true);
						void onSave(draft, previous)
							.then(() => {
								setPrevious(draft);
								const hasNewerEdits = latestDraft.current !== draft;
								setStatus(hasNewerEdits ? "Unsaved changes" : "Saved");
								onDirtyChange?.(hasNewerEdits);
							})
							.catch(() =>
								setStatus(
									"Could not save. The note may have changed elsewhere; copy your work and reload.",
								),
							)
							.finally(() => setIsSaving(false));
					}}
				>
					Save
				</Button>
				<span role="status" className="text-sm">
					{status}
				</span>
			</div>
		</div>
	);
};
