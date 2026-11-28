import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
	type ChapterSuggestion,
	ChapterSuggestions,
} from "#/components/ChapterSuggestions";
import { ChapterWordCount } from "#/components/ChapterWordCount";
import { NotePane, SeamLink } from "#/components/NotePane";
import {
	type BinderNote,
	NotesContents,
	subtreeIds,
} from "#/components/NotesContents";
import { PagedEditor, PX_PER_INCH } from "#/components/PagedEditor";
import { ProjectNotes } from "#/components/ProjectNotes";
import { type SideTab, SideTabs, toSideTab } from "#/components/SideTabs";
import { ThemeMenuItem } from "#/components/theme-toggle";
import { WordLookupContext, WordPanel } from "#/components/WordPanel";
import { WritingGuides } from "#/components/WritingGuides";
import {
	createWritingNote,
	deleteWritingNote,
	listWritingNotes,
	moveWritingNote,
	reorderWritingNote,
	updateWritingNote,
} from "#/server/writing-notes-functions";
import {
	listChapterSuggestions,
	resolveChapterSuggestion,
} from "#/server/writing-suggestions-functions";
import {
	createChapter,
	deleteChapter,
	loadChapter,
	loadWriting,
	loadWritingRevisions,
	moveChapter,
	updateChapter,
	updateWriting,
} from "#/server/writings-functions";
import { pageSizeIds, pageSizes, toPageSizeId } from "#/writing-page-sizes";

export const Route = createFileRoute("/_focus/writing/$writingId")({
	validateSearch: (
		search: Record<string, unknown>,
	): { chapter?: number; note?: number } => ({
		chapter: typeof search.chapter === "number" ? search.chapter : undefined,
		/** The note open beside the chapter, if any. */
		note: typeof search.note === "number" ? search.note : undefined,
	}),
	head: () => ({ meta: [{ title: "Writing - Andrew Byrd" }] }),
	component: WritingEditor,
});

type Writing = NonNullable<Awaited<ReturnType<typeof loadWriting>>>;
type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type PendingSave = { content: string; wordCount: number };

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;
/** How often an open writing checks for changes made elsewhere, like by an agent. */
const REFRESH_MS = 15_000;

function WritingEditor() {
	const { writingId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [writing, setWriting] = useState<Writing | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [status, setStatus] = useState<SaveStatus>("saved");
	const [chromeVisible, setChromeVisible] = useState(true);
	const [notes, setNotes] = useState<BinderNote[]>([]);
	const [noteScope, setNoteScope] = useState<"book" | "project">("book");
	// Whether the notes column is showing; remembered for each writing.
	const [notesOpen, setNotesOpenState] = useState(false);
	// Notes opened before the current one in the pane, for its back button.
	const [noteHistory, setNoteHistory] = useState<number[]>([]);
	// The word the Dictionary tab opens with, set by the toolbar's Define button.
	const [lookup, setLookup] = useState<string | null>(null);
	// Which tab the side column shows; remembered for each writing.
	const [tab, setTabState] = useState<SideTab>("notes");

	// Unsaved text lives in refs so typing never re-renders this page.
	const pending = useRef(new Map<number, PendingSave>());
	const saving = useRef(false);
	const timer = useRef<number | undefined>(undefined);
	const latestContent = useRef(new Map<number, string>());
	// The saved text version each chapter's editor started from; see contentRevision.
	const revisions = useRef(new Map<number, string>());
	// Bumped to reload the chapter's editor with text that changed elsewhere.
	const [reloads, setReloads] = useState(0);
	// Set when a save found its chapter changed elsewhere and kept the edits as a note.
	const [kept, setKept] = useState<{ noteId: number; chapter: string } | null>(
		null,
	);
	// Where the chapter editor draws its word count in the top bar.
	const [wordCountSlot, setWordCountSlot] = useState<HTMLElement | null>(null);
	// Suggested edits waiting on the open chapter.
	const [suggestions, setSuggestions] = useState<ChapterSuggestion[]>([]);
	const currentChapterId = writing
		? (
				writing.chapters.find((item) => item.id === search.chapter) ??
				writing.chapters[0]
			)?.id
		: undefined;
	const loadSuggestions = (chapterId: number) =>
		listChapterSuggestions({ data: { chapterId } }).then((list) =>
			setSuggestions(list.filter((item) => item.found)),
		);
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadSuggestions only sets state.
	useEffect(() => {
		setSuggestions([]);
		if (currentChapterId !== undefined) void loadSuggestions(currentChapterId);
	}, [currentChapterId]);

	useEffect(() => {
		void loadWriting({ data: { id: Number(writingId) } })
			.then((loaded) => {
				if (!loaded) return setLoadError(true);
				for (const chapter of loaded.chapters)
					revisions.current.set(chapter.id, chapter.revision);
				setWriting(loaded);
			})
			.catch(() => setLoadError(true));
		void listWritingNotes({ data: { writingId: Number(writingId) } }).then(
			setNotes,
		);
	}, [writingId]);

	const notesOpenKey = `abyrd.writing-notes-open.${writingId}`;
	const setNotesOpen = (next: boolean | ((open: boolean) => boolean)) =>
		setNotesOpenState((open) => {
			const value = typeof next === "function" ? next(open) : next;
			localStorage.setItem(notesOpenKey, value ? "1" : "0");
			return value;
		});

	const tabKey = `abyrd.writing-side-tab.${writingId}`;
	const setTab = (next: SideTab) => {
		localStorage.setItem(tabKey, next);
		setTabState(next);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: the keys follow writingId.
	useEffect(() => {
		setNotesOpenState(localStorage.getItem(notesOpenKey) === "1");
		setTabState(toSideTab(localStorage.getItem(tabKey)));
	}, [writingId]);

	// A note opened from a link shows in the Notes tab, whichever tab was last used.
	// biome-ignore lint/correctness/useExhaustiveDependencies: setTab only writes state and storage.
	useEffect(() => {
		if (search.note !== undefined) {
			setTab("notes");
			setNoteScope("book");
		}
	}, [search.note]);

	const refreshNotes = () =>
		listWritingNotes({ data: { writingId: Number(writingId) } }).then(setNotes);

	// ⌘\ (Ctrl+\ elsewhere) does what the notes tab beside the page does. The
	// listener is added once, so it calls the latest version through a ref.
	const toggleNotes = useRef<() => void>(() => {});
	useEffect(() => {
		const toggle = (event: KeyboardEvent) => {
			if (event.key === "\\" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				toggleNotes.current();
			}
		};
		window.addEventListener("keydown", toggle);
		return () => window.removeEventListener("keydown", toggle);
	}, []);

	// Saves queued chapters one at a time. Edits made during a save queue up
	// behind it, and a failed save stays queued for a retry.
	async function save() {
		window.clearTimeout(timer.current);
		if (saving.current) return;
		saving.current = true;
		setStatus("saving");
		try {
			for (const [id, next] of pending.current) {
				pending.current.delete(id);
				try {
					const result = await updateChapter({
						data: { id, ...next, baseRevision: revisions.current.get(id) },
					});
					if (result?.conflict) await keepConflict(result, next.content);
					else if (result) revisions.current.set(id, result.revision);
				} catch {
					if (!pending.current.has(id)) pending.current.set(id, next);
					setStatus("error");
					timer.current = window.setTimeout(() => void save(), RETRY_DELAY_MS);
					return;
				}
			}
			setStatus("saved");
		} finally {
			saving.current = false;
		}
	}

	/**
	 * The chapter changed elsewhere before this save. The server kept the
	 * edits as a note; anything typed since joins it, and the editor reloads
	 * the newer text.
	 */
	async function keepConflict(
		chapter: {
			id: number;
			title: string;
			position: number;
			content: string | null;
			revision: string;
			keptNoteId?: number;
		},
		sent: string,
	) {
		const newer = pending.current.get(chapter.id);
		pending.current.delete(chapter.id);
		if (chapter.keptNoteId && newer && newer.content !== sent)
			await updateWritingNote({
				data: { id: chapter.keptNoteId, content: newer.content },
			});
		showChapterText(chapter);
		if (chapter.keptNoteId)
			setKept({
				noteId: chapter.keptNoteId,
				chapter: chapter.title || `Chapter ${chapter.position + 1}`,
			});
		void refreshNotes();
	}

	/** Puts text saved elsewhere into the chapter, reloading its editor if open. */
	function showChapterText(chapter: {
		id: number;
		content: string | null;
		revision: string;
	}) {
		revisions.current.set(chapter.id, chapter.revision);
		latestContent.current.delete(chapter.id);
		setWriting(
			(current) =>
				current && {
					...current,
					chapters: current.chapters.map((item) =>
						item.id === chapter.id
							? {
									...item,
									content: chapter.content,
									revision: chapter.revision,
								}
							: item,
					),
				},
		);
		setReloads((count) => count + 1);
	}

	// Picks up chapters and notes changed elsewhere, like by an agent. Text
	// with unsaved edits is left alone; its next save sorts out the conflict.
	const refresh = useRef(async () => {});
	refresh.current = async () => {
		if (!writing || document.visibilityState !== "visible") return;
		const latest = await loadWritingRevisions({
			data: { writingId: writing.id },
		});
		const shape = (
			items: Array<{ id: number; title: string; position: number }>,
		) =>
			items
				.map(({ id, title, position }) => `${id}:${position}:${title}`)
				.join("|");
		if (shape(latest.chapters) !== shape(writing.chapters)) {
			const loaded = await loadWriting({ data: { id: writing.id } });
			if (loaded) {
				for (const chapter of loaded.chapters)
					if (!revisions.current.has(chapter.id))
						revisions.current.set(chapter.id, chapter.revision);
				setWriting((current) => ({
					...loaded,
					// Keep text already loaded; changed text is handled below.
					chapters: loaded.chapters.map((chapter) => {
						const known = current?.chapters.find(
							(item) => item.id === chapter.id,
						);
						return known
							? { ...known, title: chapter.title, position: chapter.position }
							: chapter;
					}),
				}));
			}
		}
		for (const { id, revision } of latest.chapters) {
			const known = revisions.current.get(id);
			if (!known || known === revision) continue;
			if (pending.current.has(id) || saving.current) continue;
			const chapter = await loadChapter({ data: { id } });
			if (chapter && !pending.current.has(id)) showChapterText(chapter);
		}
		const noteShape = (
			items: Array<{
				id: number;
				title: string;
				position: number;
				chapterId: number | null;
				parentId: number | null;
			}>,
		) =>
			items
				.map((note) =>
					[
						note.id,
						note.title,
						note.position,
						note.chapterId,
						note.parentId,
					].join(":"),
				)
				.join("|");
		if (noteShape(latest.notes) !== noteShape(notes)) void refreshNotes();
		if (currentChapterId !== undefined) {
			const waiting = latest.suggestions
				.filter((item) => item.chapterId === currentChapterId)
				.map((item) => item.id)
				.sort()
				.join();
			const shown = suggestions
				.map((item) => item.id)
				.sort()
				.join();
			if (waiting !== shown) void loadSuggestions(currentChapterId);
		}
	};
	useEffect(() => {
		const timer = window.setInterval(() => void refresh.current(), REFRESH_MS);
		return () => window.clearInterval(timer);
	}, []);

	// Save what's left when leaving, and warn if the browser would drop it.
	// biome-ignore lint/correctness/useExhaustiveDependencies: save only reads refs.
	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (pending.current.size || saving.current) event.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => {
			window.removeEventListener("beforeunload", warn);
			void save();
		};
	}, []);

	// The Options menu closes on a click outside it or Escape, like other menus.
	const optionsRef = useRef<HTMLDetailsElement>(null);
	useEffect(() => {
		const close = (event: Event) => {
			const menu = optionsRef.current;
			if (!menu?.open) return;
			if (event instanceof KeyboardEvent) {
				if (event.key !== "Escape") return;
			} else if (event.target instanceof Node && menu.contains(event.target))
				return;
			menu.open = false;
		};
		document.addEventListener("pointerdown", close);
		document.addEventListener("keydown", close);
		return () => {
			document.removeEventListener("pointerdown", close);
			document.removeEventListener("keydown", close);
		};
	}, []);

	// Controls fade out while typing and return when the mouse moves.
	useEffect(() => {
		// Phones have no mouse to move, so a tap anywhere brings them back.
		const show = () => setChromeVisible(true);
		window.addEventListener("mousemove", show);
		window.addEventListener("touchstart", show, { passive: true });
		return () => {
			window.removeEventListener("mousemove", show);
			window.removeEventListener("touchstart", show);
		};
	}, []);

	if (loadError)
		return (
			<main className="grid min-h-dvh place-items-center p-6 text-center">
				<div>
					<p className="text-slate-700">Could not open this writing.</p>
					<Link className="mt-4 inline-block underline" to="/writing">
						Back to writings
					</Link>
				</div>
			</main>
		);
	if (!writing)
		return <main className="min-h-dvh bg-stone-100 dark:bg-[#0a0a0a]" />;

	const chapters = writing.chapters;
	const index = Math.max(
		0,
		chapters.findIndex((chapter) => chapter.id === search.chapter),
	);
	const chapter = chapters[index];
	const isSingle = chapters.length === 1;
	const pageSize = toPageSizeId(writing.pageSize);

	const openNoteId = search.note ?? null;

	function goTo(chapterId: number) {
		void save();
		void navigate({
			search: { chapter: chapterId, note: search.note },
			replace: true,
		});
	}

	function openNote(id: number, { keepHistory = true } = {}) {
		setNoteScope("book");
		if (openNoteId !== null && openNoteId !== id && keepHistory)
			setNoteHistory((history) => [...history, openNoteId]);
		setNotesOpen(true);
		setTab("notes");
		void navigate({ search: { chapter: chapter.id, note: id }, replace: true });
	}

	/** Back to the notes contents, leaving the column open. */
	function showContents() {
		setNoteHistory([]);
		void navigate({ search: { chapter: chapter.id }, replace: true });
	}

	/** Hides the notes column entirely. */
	function closeNote() {
		setNotesOpen(false);
		showContents();
	}

	function backNote() {
		const previous = noteHistory.at(-1);
		if (previous === undefined) return;
		setNoteHistory((history) => history.slice(0, -1));
		openNote(previous, { keepHistory: false });
	}

	async function addNote(place: {
		chapterId: number | null;
		parentId: number | null;
	}) {
		if (!writing) return;
		const created = await createWritingNote({
			data: { writingId: writing.id, ...place, title: "" },
		});
		await refreshNotes();
		openNote(created.id);
	}

	async function removeNote(note: BinderNote) {
		const beneath = subtreeIds(notes, note.id).size - 1;
		const name = note.title || "Untitled";
		if (
			!confirm(
				beneath
					? `Delete “${name}” and the ${beneath} ${beneath === 1 ? "note" : "notes"} beneath it? This can't be undone.`
					: `Delete “${name}”? This can't be undone.`,
			)
		)
			return;
		if (openNoteId !== null && subtreeIds(notes, note.id).has(openNoteId))
			showContents();
		await deleteWritingNote({ data: { id: note.id } });
		await refreshNotes();
	}

	async function addChapter() {
		if (!writing) return;
		const created = await createChapter({ data: { writingId: writing.id } });
		revisions.current.set(created.id, created.revision);
		setWriting({ ...writing, chapters: [...writing.chapters, created] });
		goTo(created.id);
	}

	async function removeChapter() {
		if (!writing || isSingle) return;
		const chapterNotes = notes.filter(
			(note) => note.chapterId === chapter.id,
		).length;
		if (
			!confirm(
				chapterNotes
					? `Delete this chapter, its ${chapterNotes} ${chapterNotes === 1 ? "note" : "notes"}, and everything in it? This can't be undone.`
					: "Delete this chapter and everything in it? This can't be undone.",
			)
		)
			return;
		pending.current.delete(chapter.id);
		await deleteChapter({ data: { id: chapter.id } });
		const rest = writing.chapters.filter((item) => item.id !== chapter.id);
		setWriting({ ...writing, chapters: rest });
		goTo(rest[Math.max(0, index - 1)].id);
		void refreshNotes();
	}

	async function reorder(direction: "earlier" | "later") {
		if (!writing) return;
		await save();
		await moveChapter({ data: { id: chapter.id, direction } });
		const reloaded = await loadWriting({ data: { id: writing.id } });
		if (reloaded) setWriting(reloaded);
	}

	async function renameChapter(value: string) {
		if (!writing) return;
		const title = value.trim();
		if (title === chapter.title) return;
		setWriting({
			...writing,
			chapters: writing.chapters.map((item) =>
				item.id === chapter.id ? { ...item, title } : item,
			),
		});
		await updateChapter({ data: { id: chapter.id, title } });
	}

	const arrow =
		"inline-flex size-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-25 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100";
	const quiet =
		"rounded-md px-2 py-1 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100";

	// The side column: tabs for notes, the dictionary, and writing guides.
	const sideOpen = notesOpen || openNoteId !== null;
	toggleNotes.current = () => (sideOpen ? closeNote() : setNotesOpen(true));
	const lookUp = (word: string) => {
		setLookup(word);
		setTab("dictionary");
		setNotesOpen(true);
	};

	return (
		<main
			// A fixed screen: the window never scrolls. The chapter and the notes
			// each scroll in their own area.
			className="h-dvh overflow-hidden bg-stone-100 dark:bg-[#0a0a0a]"
			style={{
				["--side" as string]:
					tab === "guides"
						? "min(44vw, 40rem)"
						: tab === "dictionary"
							? "min(40vw, 36rem)"
							: openNoteId !== null
								? "min(46vw, 44rem)"
								: "min(30vw, 23rem)",
			}}
		>
			<header
				className={`fixed inset-x-0 top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 bg-stone-100/90 px-2 py-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-2 sm:px-3 text-sm backdrop-blur transition-opacity duration-500 focus-within:opacity-100 dark:bg-[#0a0a0a]/90 motion-reduce:transition-none ${chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
			>
				<div className="flex min-w-0 items-center gap-1">
					<Link
						aria-label={`Back to writings from ${writing.title}`}
						className={`${quiet} min-w-0 truncate max-sm:grid max-sm:size-9 max-sm:place-items-center max-sm:px-0`}
						to="/writing"
					>
						←<span className="max-sm:hidden"> {writing.title}</span>
					</Link>
				</div>

				<div className="flex min-w-0 items-center justify-center gap-0.5 sm:gap-1">
					<button
						aria-label="Previous chapter"
						className={arrow}
						disabled={index === 0}
						onClick={() => goTo(chapters[index - 1].id)}
						type="button"
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="18"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="18"
						>
							<path d="m15 18-6-6 6-6" />
						</svg>
					</button>
					<input
						aria-label="Chapter title"
						className={`w-[min(50vw,28rem)] min-w-0 truncate rounded-md max-sm:w-auto max-sm:flex-1 bg-transparent px-2 py-1 text-center font-serif text-base text-stone-800 outline-none placeholder:text-stone-400 focus:bg-white dark:text-stone-100 dark:focus:bg-stone-900`}
						defaultValue={chapter.title}
						// Follows renames made elsewhere.
						key={`${chapter.id}:${chapter.title}`}
						onBlur={(event) => void renameChapter(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.currentTarget.blur();
						}}
						placeholder={`Chapter ${index + 1}`}
					/>
					<button
						aria-label="Next chapter"
						className={arrow}
						disabled={index === chapters.length - 1}
						onClick={() => goTo(chapters[index + 1].id)}
						type="button"
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="18"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="18"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</button>
				</div>

				<div className="flex items-center justify-end gap-1">
					<span
						aria-live="off"
						className="px-2 text-stone-400 tabular-nums max-sm:hidden"
						ref={setWordCountSlot}
					/>
					{kept ? (
						<span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
							<span className="max-sm:hidden">
								{kept.chapter} changed elsewhere. Your edits are in a note.
							</span>
							<span className="sm:hidden">Edits kept</span>
							<button
								className="underline"
								onClick={() => {
									openNote(kept.noteId);
									setKept(null);
								}}
								type="button"
							>
								Open
							</button>
							<button
								aria-label="Dismiss"
								className="px-1"
								onClick={() => setKept(null)}
								type="button"
							>
								×
							</button>
						</span>
					) : null}
					<span
						className={`px-2 text-stone-400 ${status === "saved" ? "max-sm:sr-only" : "max-sm:px-1 max-sm:text-xs"}`}
						role="status"
					>
						{status === "saving"
							? "Saving…"
							: status === "unsaved"
								? "Edited"
								: status === "error"
									? "Not saved, retrying"
									: "Saved"}
					</span>
					<details className="relative" ref={optionsRef}>
						<summary
							aria-label="Options"
							className={`${quiet} cursor-pointer list-none max-sm:grid max-sm:size-9 max-sm:place-items-center max-sm:px-0`}
						>
							<span className="max-sm:hidden">Options</span>
							<svg
								aria-hidden="true"
								className="sm:hidden"
								fill="currentColor"
								height="18"
								viewBox="0 0 24 24"
								width="18"
							>
								<circle cx="5" cy="12" r="1.8" />
								<circle cx="12" cy="12" r="1.8" />
								<circle cx="19" cy="12" r="1.8" />
							</svg>
						</summary>
						{/* biome-ignore lint/a11y/noStaticElementInteractions: closes the menu after its buttons run. */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard-activated buttons fire click too. */}
						<div
							onClick={(event) => {
								if (
									event.target instanceof Element &&
									event.target.closest("button")
								)
									event.currentTarget
										.closest("details")
										?.removeAttribute("open");
							}}
							className="absolute right-0 mt-2 grid w-64 gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-800"
						>
							<ThemeMenuItem />
							<div className="my-1 border-t border-stone-200 dark:border-stone-700" />
							<label className="grid gap-1 px-2 py-1 text-stone-600 dark:text-stone-300">
								Page size
								<select
									className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
									onChange={(event) => {
										const next = toPageSizeId(event.target.value);
										setWriting({ ...writing, pageSize: next });
										void updateWriting({
											data: { id: writing.id, pageSize: next },
										});
									}}
									value={pageSize}
								>
									{pageSizeIds.map((id) => (
										<option key={id} value={id}>
											{pageSizes[id].label}
										</option>
									))}
								</select>
							</label>
							<button
								className={`${quiet} text-left`}
								onClick={() => void addChapter()}
								type="button"
							>
								New chapter
							</button>
							{!isSingle ? (
								<>
									<button
										className={`${quiet} text-left disabled:opacity-40`}
										disabled={index === 0}
										onClick={() => void reorder("earlier")}
										type="button"
									>
										Move chapter earlier
									</button>
									<button
										className={`${quiet} text-left disabled:opacity-40`}
										disabled={index === chapters.length - 1}
										onClick={() => void reorder("later")}
										type="button"
									>
										Move chapter later
									</button>
									<button
										className={`${quiet} text-left text-red-700`}
										onClick={() => void removeChapter()}
										type="button"
									>
										Delete chapter
									</button>
								</>
							) : null}
						</div>
					</details>
					{/* On phones the panel opens from the top bar; there's no room beside the page. */}
					<button
						aria-label={sideOpen ? "Close side panel" : "Show side panel"}
						aria-pressed={sideOpen}
						className={`grid size-9 place-items-center rounded-md text-stone-600 transition hover:bg-stone-200 sm:hidden dark:text-stone-300 dark:hover:bg-stone-800 ${sideOpen ? "bg-stone-200 dark:bg-stone-800" : ""}`}
						onClick={() => toggleNotes.current()}
						type="button"
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="18"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="18"
						>
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
				</div>
			</header>

			{/* The page and its notes sit side by side under the top bar. The
			    chapter's half scrolls, desk included; the notes column scrolls on
			    its own. With notes open, the page moves over to meet them. */}
			<WordLookupContext.Provider value={lookUp}>
				<div className="flex h-full">
					<div className="min-w-0 flex-1 overflow-y-auto">
						<div
							className={`flex px-2 pt-16 pb-24 sm:px-6 sm:pt-24 ${sideOpen ? "md:justify-end md:pr-8" : "justify-center"}`}
						>
							<div
								className="relative min-w-0"
								style={{
									flex: `0 1 ${pageSizes[pageSize].width * PX_PER_INCH + 24}px`,
								}}
							>
								<PagedEditor
									initialContent={
										latestContent.current.get(chapter.id) ?? chapter.content
									}
									key={`${chapter.id}:${reloads}`}
									onChange={(content, wordCount) => {
										const previous =
											latestContent.current.get(chapter.id) ?? chapter.content;
										latestContent.current.set(chapter.id, content);
										if (content === previous) return;
										pending.current.set(chapter.id, { content, wordCount });
										setStatus((current) =>
											current === "saving" ? current : "unsaved",
										);
										window.clearTimeout(timer.current);
										timer.current = window.setTimeout(
											() => void save(),
											SAVE_DELAY_MS,
										);
									}}
									onTyping={() => setChromeVisible(false)}
									pageSize={pageSize}
								>
									<ChapterWordCount slot={wordCountSlot} />
									<ChapterSuggestions
										onResolve={(id, outcome) => {
											setSuggestions((current) =>
												current.filter((item) => item.id !== id),
											);
											void resolveChapterSuggestion({
												data: { id, ...outcome },
											});
										}}
										suggestions={suggestions}
									/>
								</PagedEditor>
								{sideOpen ? null : (
									<button
										aria-label="Show side panel (⌘\)"
										// Sits just right of the page, level with its top edge.
										className={`absolute top-0 -right-[30px] grid size-8 place-items-center rounded-md border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:text-stone-900 max-sm:hidden dark:border-stone-700 dark:hover:text-stone-100 ${chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"} duration-500 motion-reduce:transition-none`}
										onClick={() => toggleNotes.current()}
										title="Notes, dictionary, and guides (⌘\)"
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
											<path d="M4 6h16M4 12h16M4 18h16" />
										</svg>
									</button>
								)}
							</div>
						</div>
					</div>

					{sideOpen ? (
						<div className="min-w-0 max-md:fixed max-md:inset-x-0 max-md:top-[52px] max-md:bottom-0 max-md:z-30 max-md:bg-stone-100 md:flex-1 md:pt-24 md:pb-6 md:pl-8 dark:max-md:bg-[#0a0a0a]">
							<div className="flex h-full w-full flex-col md:max-w-[var(--side)] md:pr-6">
								<SideTabs onClose={closeNote} onTab={setTab} tab={tab} />
								{tab === "notes" && writing.projectId ? (
									<div className="mb-4 flex items-center gap-4 px-3 text-sm">
										<button
											type="button"
											aria-pressed={noteScope === "book"}
											className={
												noteScope === "book"
													? "font-medium text-stone-950 underline underline-offset-4 dark:text-stone-100"
													: "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
											}
											onClick={() => setNoteScope("book")}
										>
											This book
										</button>
										<button
											type="button"
											aria-pressed={noteScope === "project"}
											className={
												noteScope === "project"
													? "font-medium text-stone-950 underline underline-offset-4 dark:text-stone-100"
													: "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
											}
											onClick={() => setNoteScope("project")}
										>
											Project wiki
										</button>
									</div>
								) : null}
								{tab === "notes" && openNoteId !== null ? null : (
									// An open note draws its own, blue when it's tied to the chapter.
									<SeamLink
										faded
										key={tab}
										label="Open a note to tie it to this chapter"
										tied={false}
									/>
								)}
								<div className="min-h-0 flex-1">
									{/* Stays mounted while hidden, so the word you were reading is
									    still there when you come back. */}
									<div className={tab === "dictionary" ? "contents" : "hidden"}>
										<WordPanel key={lookup ?? ""} word={lookup} />
									</div>
									{tab === "dictionary" ? null : tab === "guides" ? (
										<WritingGuides />
									) : noteScope === "project" && writing.projectId ? (
										<ProjectNotes
											key={writing.projectId}
											projectId={writing.projectId}
											currentChapter={chapter}
										/>
									) : openNoteId !== null ? (
										<NotePane
											canGoBack={noteHistory.length > 0}
											currentChapter={chapter}
											onShowContents={showContents}
											key={openNoteId}
											noteId={openNoteId}
											projectId={writing.projectId}
											onShared={() => {
												void refreshNotes();
												showContents();
												setNoteScope("project");
											}}
											onBack={backNote}
											onOpenChapter={goTo}
											onOpenNote={(id) => openNote(id)}
											onKeptEdits={(keptId) => {
												void refreshNotes();
												setKept({ noteId: keptId, chapter: "This note" });
											}}
											onTitleChange={(id, title) =>
												setNotes((current) =>
													current.map((note) =>
														note.id === id ? { ...note, title } : note,
													),
												)
											}
										/>
									) : (
										<NotesContents
											chapters={chapters}
											currentChapterId={chapter.id}
											notes={notes}
											onCreate={(place) => void addNote(place)}
											onDelete={(note) => void removeNote(note)}
											onMove={(id, to) =>
												void moveWritingNote({ data: { id, ...to } }).then(
													refreshNotes,
												)
											}
											onOpenChapter={goTo}
											onOpenNote={(id) => openNote(id)}
											onRename={(id, title) => {
												setNotes((current) =>
													current.map((note) =>
														note.id === id ? { ...note, title } : note,
													),
												);
												void updateWritingNote({ data: { id, title } });
											}}
											onReorder={(id, direction) =>
												void reorderWritingNote({
													data: { id, direction },
												}).then(refreshNotes)
											}
										/>
									)}
								</div>
							</div>
						</div>
					) : null}
				</div>
			</WordLookupContext.Provider>
		</main>
	);
}
