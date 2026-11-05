import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useContext, useEffect, useRef, useState } from "react";
import { KindleBookNotes } from "#/components/KindleBookNotes";
import { KindleDraftContext } from "#/components/KindleDraftContext";
import { findDisplacedKindleDrafts } from "#/components/kindle-draft-changes";
import { restoreKindleLibraryPosition } from "#/components/kindle-library-position";
import { Button } from "#/components/primitives/button";
import {
	loadArchivedKindleLibrary,
	updateKindleArchive,
	updateKindleBookArchive,
} from "#/server/kindle-functions";

export const Route = createFileRoute("/_authenticated/kindle/archived")({
	component: ArchivedKindleAnnotations,
});

function ArchivedKindleAnnotations() {
	const [library, setLibrary] = useState<Awaited<
		ReturnType<typeof loadArchivedKindleLibrary>
	> | null>(null);
	const [error, setError] = useState("");
	const [restoring, setRestoring] = useState<string | null>(null);
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
	const refresh = async () => {
		const next = await loadArchivedKindleLibrary();
		if (library) {
			const displaced = findDisplacedKindleDrafts(
				library,
				next,
				dirtyNotes.current,
				true,
			);
			if (
				displaced.length &&
				!confirm(
					"The library changed elsewhere. Refreshing would discard unsaved edits. Continue?",
				)
			)
				throw new Error("Refresh cancelled");
			for (const key of displaced) dirtyNotes.current.delete(key);
		}
		setLibrary(next);
	};
	useEffect(() => {
		void loadArchivedKindleLibrary()
			.then(setLibrary)
			.catch(() => setError("Could not load archived highlights."));
	}, []);
	useEffect(() => {
		if (
			!library ||
			restoredPosition.current ||
			!location.hash.startsWith("#book-")
		)
			return;
		const saved = restoreKindleLibraryPosition(
			"/kindle/archived",
			decodeURIComponent(location.hash.slice(6)),
		);
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
	const books =
		library?.books.filter(
			(book) =>
				book.archivedAt !== null ||
				library.annotations.some((item) => item.bookAsin === book.asin),
		) ?? [];
	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<Link
				className="mb-5 self-start text-sm text-slate-600 hover:underline"
				to="/kindle"
			>
				← Back to Kindle library
			</Link>
			<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
				Kindle library
			</p>
			<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
				Archived highlights.
			</h1>
			{error && (
				<p role="alert" className="mt-4 text-red-700">
					{error}
				</p>
			)}
			<div className="mt-8 grid gap-4">
				{books.map((book) => {
					const annotations =
						library?.annotations.filter(
							(item) => item.bookAsin === book.asin,
						) ?? [];
					return (
						<article
							id={`book-${book.asin}`}
							key={`${book.asin}:${book.archivedAt !== null}`}
							className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
							inert={restoring === book.asin || undefined}
						>
							<div className="flex items-start gap-4">
								{book.coverUrl && (
									<img
										alt=""
										className="h-24 w-16 shrink-0 rounded object-cover"
										loading="lazy"
										src={book.coverUrl}
									/>
								)}
								<div className="min-w-0 flex-1">
									<h2 className="font-medium text-slate-950">{book.title}</h2>
									<p className="mt-1 text-sm text-slate-600">{book.author}</p>
									<p className="mt-2 text-sm text-slate-600">
										{annotations.length} archived notes and highlights
									</p>
								</div>
								{book.archivedAt !== null && (
									<Button
										onClick={() => {
											const dirty = [...dirtyNotes.current].filter((key) =>
												key.startsWith(`${book.asin}:`),
											);
											if (
												dirty.length &&
												!confirm(
													"Restoring this book will discard unsaved edits. Continue?",
												)
											)
												return;
											setRestoring(book.asin);
											void updateKindleBookArchive({
												data: { asin: book.asin, archived: false },
											})
												.then(async () => {
													await refresh();
													for (const key of dirty)
														dirtyNotes.current.delete(key);
												})
												.catch(() =>
													setError(
														"Could not restore the book or refresh the page.",
													),
												)
												.finally(() => setRestoring(null));
										}}
									>
										Restore book
									</Button>
								)}
							</div>
							<details
								data-kindle-panel={`book:${book.asin}`}
								className="mt-5 border-t border-slate-200 pt-4"
							>
								<summary className="cursor-pointer text-sm font-medium text-slate-700">
									View archived notes and highlights ({annotations.length})
								</summary>
								<KindleBookNotes
									book={book}
									annotations={annotations}
									chapters={
										library?.chapters.filter(
											(chapter) => chapter.bookAsin === book.asin,
										) ?? []
									}
									isArchived
									refresh={refresh}
									onDirtyChange={(key, dirty) => {
										if (dirty) dirtyNotes.current.add(key);
										else dirtyNotes.current.delete(key);
									}}
									archive={async (id) => {
										const dirty = [...dirtyNotes.current].filter((key) =>
											key.startsWith(`${book.asin}:`),
										);
										if (
											book.archivedAt !== null &&
											!confirm(
												dirty.length
													? "Restoring this note will restore the book and discard its unsaved edits. Continue?"
													: "Restoring this note will also restore the book. Continue?",
											)
										)
											throw new Error("Cancelled");
										await updateKindleArchive({
											data: { id, archived: false },
										});
										await refresh();
										if (book.archivedAt !== null)
											for (const key of dirty) dirtyNotes.current.delete(key);
									}}
								/>
							</details>
						</article>
					);
				})}
				{library && books.length === 0 && (
					<p className="text-slate-600">Nothing is archived.</p>
				)}
			</div>
		</section>
	);
}
