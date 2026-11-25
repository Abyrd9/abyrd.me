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
	currentChapter,
	canGoBack,
	onBack,
	onShowContents,
	onClose,
	onOpenNote,
	onOpenChapter,
	onTitleChange,
}: {
	noteId: number;
	/** The chapter on the page, to show whether this note is tied to it. */
	currentChapter: { id: number; title: string; position: number };
	canGoBack: boolean;
	onBack: () => void;
	/** Returns to the notes contents. */
	onShowContents: () => void;
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

	// Tied when the note is one of this chapter's own, or the chapter links to it.
	const tie = !note
		? null
		: note.chapterId === currentChapter.id
			? `Belongs to ${chapterLabel(currentChapter)}`
			: note.backlinks.some(
						(link) => link.kind === "chapter" && link.id === currentChapter.id,
					)
				? `${chapterLabel(currentChapter)} links here`
				: null;
	const tieLabel = tie ?? `Not tied to ${chapterLabel(currentChapter)}`;

	// The note's controls ride on its paper, pinned while the note scrolls, so
	// the note's page starts level with the chapter's.
	const strip = (
		<div className="sticky top-0 z-10 -mx-5 mb-6 flex items-center gap-1 border-b border-stone-100 bg-white px-3 py-2 text-sm sm:-mx-10 sm:px-6 dark:border-stone-800">
			<button
				className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-200/80 py-1 pr-3 pl-1.5 text-xs text-stone-800 hover:bg-stone-300/80 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
				onClick={onShowContents}
				type="button"
			>
				<svg
					aria-hidden="true"
					fill="none"
					height="14"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					viewBox="0 0 24 24"
					width="14"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
				Contents
			</button>
			{canGoBack ? (
				<button
					aria-label="Back to the previous note"
					className={control}
					onClick={onBack}
					title="Previous note"
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
						<path d="M9 14 4 9l5-5" />
						<path d="M4 9h11a5 5 0 0 1 0 10h-3" />
					</svg>
				</button>
			) : null}
			<nav
				aria-label="Where this note sits"
				className="flex min-w-0 flex-1 items-center gap-0.5 text-xs"
			>
				{note ? (
					<>
						{note.chapter ? (
							<button
								className={crumb}
								onClick={() => note.chapter && onOpenChapter(note.chapter.id)}
								type="button"
							>
								{chapterLabel(note.chapter)}
							</button>
						) : (
							<span className="truncate px-1 text-stone-400">
								The whole book
							</span>
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
				aria-label="Hide notes (⌘\)"
				className={control}
				onClick={onClose}
				title="Hide notes (⌘\)"
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
		</div>
	);

	return (
		<section
			aria-label="Note"
			className="relative flex h-full flex-col bg-stone-100 dark:bg-[#0a0a0a]"
		>
			{note ? (
				// Sits on the seam between the chapter and the note.
				<span
					aria-label={tieLabel}
					className={`absolute top-16 -left-[19px] z-10 grid size-9 place-items-center rounded-full border shadow-sm ${tie ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400" : "border-stone-200 bg-white text-stone-400 dark:border-stone-700"}`}
					role="img"
					title={tieLabel}
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
						<path d="M10 13a5 5 0 0 0 7.07 0l2-2A5 5 0 0 0 12 3.93l-1.15 1.15" />
						<path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.14-1.14" />
					</svg>
				</span>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto pb-6">
				{note === undefined || note === null ? (
					<div className="mx-auto w-full max-w-[40rem] bg-white px-5 pb-10 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:px-10">
						{strip}
						<p className="text-sm text-stone-500">
							{note === undefined
								? "Opening note…"
								: "This note no longer exists. It may have been deleted."}
						</p>
					</div>
				) : (
					<NoteEditor
						autoFocus={false}
						header={
							<>
								{strip}
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
							</>
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
