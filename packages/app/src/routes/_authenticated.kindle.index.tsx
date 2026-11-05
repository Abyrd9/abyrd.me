import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { BookDescription } from "#/components/BookDescription";
import { KindleBookNotes } from "#/components/KindleBookNotes";
import { KindleDraftContext } from "#/components/KindleDraftContext";
import { findDisplacedKindleDrafts } from "#/components/kindle-draft-changes";
import { restoreKindleLibraryPosition } from "#/components/kindle-library-position";
import { Button } from "#/components/primitives/button";
import {
	loadKindleLibrary,
	updateKindleArchive,
	updateKindleBookArchive,
} from "#/server/kindle-functions";

export const Route = createFileRoute("/_authenticated/kindle/")({
	component: KindleLibrary,
});

function KindleLibrary() {
	const [library, setLibrary] = useState<Awaited<
		ReturnType<typeof loadKindleLibrary>
	> | null>(null);
	const [query, setQuery] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [archiving, setArchiving] = useState<string | null>(null);
	const restoredPosition = useRef(false);
	const draftContext = useContext(KindleDraftContext);
	if (!draftContext) throw new Error("Kindle draft context is missing.");
	const dirtyNotes = draftContext;
	useBlocker({
		shouldBlockFn: () => {
			if (!dirtyNotes.current.size) return false;
			if (!confirm("You have unsaved notes. Leave without saving?"))
				return true;
			dirtyNotes.current.clear();
			return false;
		},
		enableBeforeUnload: () => dirtyNotes.current.size > 0,
	});

	useEffect(() => {
		void loadKindleLibrary()
			.then(setLibrary)
			.catch(() =>
				setMessage(
					"Could not load your Kindle library. Refresh and try again.",
				),
			);
	}, []);
	useEffect(() => {
		if (
			!library ||
			restoredPosition.current ||
			!location.hash.startsWith("#book-")
		)
			return;
		const saved = restoreKindleLibraryPosition(
			"/kindle",
			decodeURIComponent(location.hash.slice(6)),
		);
		if (saved) setQuery(saved.query);
		const frame = requestAnimationFrame(() => {
			restoredPosition.current = true;
			for (const panel of document.querySelectorAll<HTMLDetailsElement>(
				"details[data-kindle-panel]",
			)) {
				if (
					saved?.open.includes(panel.dataset.kindlePanel ?? "") ||
					(!saved &&
						panel.dataset.kindlePanel ===
							`book:${decodeURIComponent(location.hash.slice(6))}`)
				)
					panel.open = true;
			}
			requestAnimationFrame(() => {
				if (saved) window.scrollTo(0, saved.scroll);
				else
					document
						.getElementById(decodeURIComponent(location.hash.slice(1)))
						?.scrollIntoView();
			});
		});
		return () => cancelAnimationFrame(frame);
	}, [library]);

	const books = useMemo(() => {
		const annotations = library?.annotations ?? [];
		return (library?.books ?? [])
			.filter((book) => book.archivedAt === null)
			.map((book) => ({
				...book,
				annotations: annotations.filter(
					(annotation) => annotation.bookAsin === book.asin,
				),
			}));
	}, [library]);
	const search = query.trim().toLowerCase();
	const visibleBooks = books.filter((book) =>
		`${book.title} ${book.author}`.toLowerCase().includes(search),
	);

	async function archiveAnnotation(id: number) {
		await updateKindleArchive({ data: { id, archived: true } });
		setLibrary((current) =>
			current
				? {
						...current,
						annotations: current.annotations.filter(
							(annotation) => annotation.id !== id,
						),
					}
				: current,
		);
	}

	async function archiveBook(asin: string) {
		const dirty = [...dirtyNotes.current].filter((key) =>
			key.startsWith(`${asin}:`),
		);
		if (
			dirty.length &&
			!confirm("Archiving this book will discard unsaved edits. Continue?")
		)
			return;
		setArchiving(asin);
		try {
			await updateKindleBookArchive({ data: { asin, archived: true } });
		} catch {
			setMessage("Could not archive the book. Please try again.");
			return;
		} finally {
			setArchiving(null);
		}
		for (const key of dirty) dirtyNotes.current.delete(key);
		setLibrary((current) =>
			current
				? {
						...current,
						books: current.books.filter((book) => book.asin !== asin),
						annotations: current.annotations.filter(
							(annotation) => annotation.bookAsin !== asin,
						),
					}
				: current,
		);
	}

	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Kindle library
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Your notes and highlights.
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					Keep the parts of your Kindle library that you want to find again.
				</p>
			</div>
			<div className="mt-8 flex flex-wrap gap-3">
				<Button disabled id="sync-kindle-now" type="button">
					Waiting for Kindle extension
				</Button>
				<Link
					className="inline-flex min-h-9 items-center rounded-md bg-slate-100 px-3 text-sm font-normal text-slate-700 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
					to="/kindle/setup"
				>
					Set up Kindle sync
				</Link>
				<Link
					className="inline-flex min-h-9 items-center rounded-md bg-slate-100 px-3 text-sm font-normal text-slate-700 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
					to="/kindle/archived"
				>
					Archived
				</Link>
			</div>
			<p className="mt-4 text-sm text-slate-600" id="kindle-sync-status">
				Load the extension to sync your Kindle library.
			</p>
			{message ? <p className="mt-8 text-red-700">{message}</p> : null}
			{!library && !message ? (
				<p className="mt-8 text-slate-600">Loading Kindle library…</p>
			) : null}
			{library ? (
				<>
					{library.lastSync ? (
						<p className="mt-8 text-sm text-slate-600">
							Last completed import: {library.lastSync.status}.
						</p>
					) : null}
					<label className="mt-5 grid max-w-xl gap-2 text-sm font-medium text-slate-700">
						Search books
						<input
							className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Title or author"
							value={query}
						/>
					</label>
					<div className="mt-8 grid gap-4">
						{books.map((book) => (
							<article
								id={`book-${book.asin}`}
								inert={archiving === book.asin || undefined}
								hidden={!visibleBooks.includes(book)}
								className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
								key={book.asin}
							>
								<div className="flex items-start justify-between gap-4">
									{book.coverUrl ? (
										<img
											alt=""
											className="h-24 w-16 shrink-0 rounded object-cover shadow-sm"
											loading="lazy"
											src={book.coverUrl}
										/>
									) : null}
									<div className="min-w-0 flex-1">
										<h2 className="font-medium text-slate-950">{book.title}</h2>
										<p className="mt-1 text-sm text-slate-600">{book.author}</p>
										<BookDescription title={book.title} author={book.author} />
										<p className="mt-2 text-sm text-slate-600">
											{book.annotations.length}{" "}
											{book.annotations.length === 1
												? "note or highlight"
												: "notes and highlights"}
										</p>
									</div>
									<Button onClick={() => void archiveBook(book.asin)}>
										Archive book
									</Button>
								</div>
								<details
									data-kindle-panel={`book:${book.asin}`}
									className="mt-5 border-t border-slate-200 pt-4"
								>
									<summary className="cursor-pointer text-sm font-medium text-slate-700">
										View notes and highlights ({book.annotations.length})
									</summary>
									<KindleBookNotes
										onDirtyChange={(key, dirty) => {
											if (dirty) dirtyNotes.current.add(key);
											else dirtyNotes.current.delete(key);
										}}
										book={book}
										annotations={book.annotations}
										chapters={library.chapters.filter(
											(chapter) => chapter.bookAsin === book.asin,
										)}
										refresh={async () => {
											const next = await loadKindleLibrary();
											const displaced = findDisplacedKindleDrafts(
												library,
												next,
												dirtyNotes.current,
												false,
											);
											if (
												displaced.length &&
												!confirm(
													"The library changed elsewhere. Refreshing would discard unsaved edits. Continue?",
												)
											)
												throw new Error("Refresh cancelled");
											for (const key of displaced)
												dirtyNotes.current.delete(key);
											setLibrary(next);
										}}
										archive={archiveAnnotation}
									/>
								</details>
							</article>
						))}
						{visibleBooks.length === 0 ? (
							<p className="text-slate-600">No books match this search.</p>
						) : null}
					</div>
				</>
			) : null}
		</section>
	);
}
