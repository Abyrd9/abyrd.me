import { useEffect, useRef, useState } from "react";
import { NoteEditor } from "#/components/NoteEditor";
import {
	loadWritingNote,
	updateWritingNote,
} from "#/server/writing-notes-functions";

type Note = NonNullable<Awaited<ReturnType<typeof loadWritingNote>>>;
type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;

/** Names a chapter the way the editor's title bar does. */
export const chapterLabel = (chapter: { title: string; position: number }) =>
	chapter.title || `Chapter ${chapter.position + 1}`;

/**
 * One note beside the chapter: where it sits, its title, and its text.
 * Mount it with a key per note so each note saves on its own.
 */
export const NotePane = ({
	noteId,
	canGoBack,
	onBack,
	onClose,
	onOpenNote,
	onOpenChapter,
	onTitleChange,
}: {
	noteId: number;
	canGoBack: boolean;
	onBack: () => void;
	onClose: () => void;
	onOpenNote: (id: number) => void;
	onOpenChapter: (chapterId: number) => void;
	/** Lets the binder show a renamed note right away. */
	onTitleChange: (id: number, title: string) => void;
}) => {
	const [note, setNote] = useState<Note | null | undefined>(undefined);
	const [status, setStatus] = useState<SaveStatus>("saved");
	const pending = useRef<string | null>(null);
	const saving = useRef(false);
	const timer = useRef<number | undefined>(undefined);

	useEffect(() => {
		void loadWritingNote({ data: { id: noteId } })
			.then(setNote)
			.catch(() => setNote(null));
	}, [noteId]);

	// Saves the newest text; edits made during a save follow right after it.
	async function save() {
		window.clearTimeout(timer.current);
		if (saving.current || pending.current === null) return;
		const content = pending.current;
		pending.current = null;
		saving.current = true;
		setStatus("saving");
		try {
			await updateWritingNote({ data: { id: noteId, content } });
			setStatus(pending.current === null ? "saved" : "unsaved");
		} catch {
			pending.current ??= content;
			setStatus("error");
			timer.current = window.setTimeout(() => void save(), RETRY_DELAY_MS);
			return;
		} finally {
			saving.current = false;
		}
		if (pending.current !== null) void save();
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: save only reads refs.
	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (pending.current !== null || saving.current) event.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => {
			window.removeEventListener("beforeunload", warn);
			void save();
		};
	}, []);

	const control =
		"inline-flex size-8 shrink-0 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-stone-800 dark:hover:text-stone-100";
	const crumb =
		"min-w-0 truncate rounded px-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100";

	return (
		<section
			aria-label="Note"
			className="flex h-full flex-col bg-stone-100 dark:bg-[#0a0a0a]"
		>
			<header className="flex items-center gap-1 border-b border-stone-200 px-2 py-1.5 text-sm dark:border-stone-800">
				<button
					aria-label="Back to the previous note"
					className={control}
					disabled={!canGoBack}
					onClick={onBack}
					type="button"
				>
					<svg
						aria-hidden="true"
						fill="none"
						height="16"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						viewBox="0 0 24 24"
						width="16"
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>
				<nav
					aria-label="Where this note sits"
					className="flex min-w-0 flex-1 items-center gap-0.5 text-xs"
				>
					{note ? (
						<>
							<span className="min-w-0 truncate px-1 text-stone-400">
								{note.writing.title}
							</span>
							<span aria-hidden="true" className="text-stone-300">
								›
							</span>
							{note.chapter ? (
								<button
									className={crumb}
									onClick={() => note.chapter && onOpenChapter(note.chapter.id)}
									type="button"
								>
									{chapterLabel(note.chapter)}
								</button>
							) : (
								<span className="truncate px-1 text-stone-400">Book notes</span>
							)}
							{note.ancestors.map((ancestor) => (
								<span
									className="flex min-w-0 items-center gap-0.5"
									key={ancestor.id}
								>
									<span aria-hidden="true" className="text-stone-300">
										›
									</span>
									<button
										className={crumb}
										onClick={() => onOpenNote(ancestor.id)}
										type="button"
									>
										{ancestor.title || "Untitled"}
									</button>
								</span>
							))}
						</>
					) : null}
				</nav>
				<span className="px-1 text-xs text-stone-400" role="status">
					{status === "saving"
						? "Saving…"
						: status === "unsaved"
							? "Edited"
							: status === "error"
								? "Not saved, retrying"
								: note
									? "Saved"
									: ""}
				</span>
				<button
					aria-label="Close note"
					className={control}
					onClick={onClose}
					type="button"
				>
					<svg
						aria-hidden="true"
						fill="none"
						height="16"
						stroke="currentColor"
						strokeLinecap="round"
						strokeWidth="2"
						viewBox="0 0 24 24"
						width="16"
					>
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</header>

			<div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
				{note === undefined ? (
					<p className="p-6 text-sm text-stone-500">Opening note…</p>
				) : note === null ? (
					<p className="p-6 text-sm text-stone-500">
						This note no longer exists. It may have been deleted.
					</p>
				) : (
					<NoteEditor
						autoFocus={false}
						header={
							<input
								aria-label="Note title"
								className="font-book w-full bg-transparent leading-tight text-stone-900 outline-none placeholder:text-stone-300 dark:text-stone-100"
								defaultValue={note.title}
								onBlur={(event) => {
									const title = event.target.value.trim();
									if (title === note.title) return;
									setNote({ ...note, title });
									onTitleChange(note.id, title);
									void updateWritingNote({ data: { id: note.id, title } });
								}}
								onKeyDown={(event) => {
									if (event.key === "Enter") event.currentTarget.blur();
								}}
								placeholder="Untitled"
								style={{ fontSize: "1.6em" }}
								// A new note opens on its title, ready to name.
								ref={(element) => {
									if (element && !note.title && !element.dataset.focused) {
										element.dataset.focused = "true";
										element.focus();
									}
								}}
							/>
						}
						initialContent={note.content}
						onChange={(content) => {
							if (content === note.content && pending.current === null) return;
							pending.current = content;
							setStatus((current) =>
								current === "saving" ? current : "unsaved",
							);
							window.clearTimeout(timer.current);
							timer.current = window.setTimeout(
								() => void save(),
								SAVE_DELAY_MS,
							);
						}}
					/>
				)}
			</div>
		</section>
	);
};
