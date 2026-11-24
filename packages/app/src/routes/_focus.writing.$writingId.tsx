import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PagedEditor } from "#/components/PagedEditor";
import {
	createChapter,
	deleteChapter,
	loadWriting,
	moveChapter,
	updateChapter,
	updateWriting,
} from "#/server/writings-functions";
import { pageSizeIds, pageSizes, toPageSizeId } from "#/writing-page-sizes";

export const Route = createFileRoute("/_focus/writing/$writingId")({
	validateSearch: (search: Record<string, unknown>) => ({
		chapter: typeof search.chapter === "number" ? search.chapter : undefined,
	}),
	head: () => ({ meta: [{ title: "Writing - Andrew Byrd" }] }),
	component: WritingEditor,
});

type Writing = NonNullable<Awaited<ReturnType<typeof loadWriting>>>;
type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type PendingSave = { content: string; wordCount: number };

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;

function WritingEditor() {
	const { writingId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [writing, setWriting] = useState<Writing | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [status, setStatus] = useState<SaveStatus>("saved");
	const [chromeVisible, setChromeVisible] = useState(true);

	// Unsaved text lives in refs so typing never re-renders this page.
	const pending = useRef(new Map<number, PendingSave>());
	const saving = useRef(false);
	const timer = useRef<number | undefined>(undefined);
	const latestContent = useRef(new Map<number, string>());

	useEffect(() => {
		void loadWriting({ data: { id: Number(writingId) } })
			.then((loaded) => (loaded ? setWriting(loaded) : setLoadError(true)))
			.catch(() => setLoadError(true));
	}, [writingId]);

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
					await updateChapter({ data: { id, ...next } });
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

	// Controls fade out while typing and return when the mouse moves.
	useEffect(() => {
		const show = () => setChromeVisible(true);
		window.addEventListener("mousemove", show);
		return () => window.removeEventListener("mousemove", show);
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

	function goTo(chapterId: number) {
		void save();
		void navigate({ search: { chapter: chapterId }, replace: true });
	}

	async function addChapter() {
		if (!writing) return;
		const created = await createChapter({ data: { writingId: writing.id } });
		setWriting({ ...writing, chapters: [...writing.chapters, created] });
		goTo(created.id);
	}

	async function removeChapter() {
		if (!writing || isSingle) return;
		if (
			!confirm(
				"Delete this chapter and everything in it? This can't be undone.",
			)
		)
			return;
		pending.current.delete(chapter.id);
		await deleteChapter({ data: { id: chapter.id } });
		const rest = writing.chapters.filter((item) => item.id !== chapter.id);
		setWriting({ ...writing, chapters: rest });
		goTo(rest[Math.max(0, index - 1)].id);
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
		"inline-flex size-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-stone-800 dark:hover:text-stone-100";
	const quiet =
		"rounded-md px-2 py-1 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100";

	return (
		<main className="min-h-dvh bg-stone-100 pb-24 dark:bg-[#0a0a0a]">
			<header
				className={`fixed inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-stone-100/90 px-3 py-2 text-sm backdrop-blur transition-opacity duration-500 focus-within:opacity-100 dark:bg-[#0a0a0a]/90 motion-reduce:transition-none ${chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
			>
				<div className="flex min-w-0 items-center gap-1">
					<Link
						aria-label={`Back to writings from ${writing.title}`}
						className={`${quiet} min-w-0 truncate`}
						to="/writing"
					>
						← {writing.title}
					</Link>
				</div>

				<div className="flex min-w-0 items-center gap-1">
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
						className="w-[min(50vw,28rem)] truncate rounded-md bg-transparent px-2 py-1 text-center font-serif text-base text-stone-800 outline-none placeholder:text-stone-400 focus:bg-white dark:text-stone-100 dark:focus:bg-stone-900"
						defaultValue={chapter.title}
						key={chapter.id}
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
					<span className="px-2 text-stone-400" role="status">
						{status === "saving"
							? "Saving…"
							: status === "unsaved"
								? "Edited"
								: status === "error"
									? "Not saved, retrying"
									: "Saved"}
					</span>
					<details className="relative">
						<summary className={`${quiet} cursor-pointer list-none`}>
							Options
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
							<label className="grid gap-1 px-2 py-1 text-stone-600">
								Page size
								<select
									className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-stone-900"
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
				</div>
			</header>

			<div className="pt-20">
				<PagedEditor
					initialContent={
						latestContent.current.get(chapter.id) ?? chapter.content
					}
					key={chapter.id}
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
						timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
					}}
					onTyping={() => setChromeVisible(false)}
					pageSize={pageSize}
				/>
			</div>
		</main>
	);
}
