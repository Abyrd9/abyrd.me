import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

	useEffect(() => {
		void loadKindleLibrary()
			.then(setLibrary)
			.catch(() =>
				setMessage(
					"Could not load your Kindle library. Refresh and try again.",
				),
			);
	}, []);

	const books = useMemo(() => {
		const annotations = library?.annotations ?? [];
		const grouped = new Map<
			string,
			{
				asin: string;
				title: string;
				author: string;
				annotations: typeof annotations;
			}
		>();

		for (const annotation of annotations) {
			const book = grouped.get(annotation.bookAsin);

			if (book) book.annotations.push(annotation);
			else {
				grouped.set(annotation.bookAsin, {
					asin: annotation.bookAsin,
					title: annotation.title,
					author: annotation.author,
					annotations: [annotation],
				});
			}
		}

		const search = query.trim().toLowerCase();

		return [...grouped.values()].filter((book) =>
			`${book.title} ${book.author}`.toLowerCase().includes(search),
		);
	}, [library, query]);

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
		await updateKindleBookArchive({ data: { asin, archived: true } });
		setLibrary((current) =>
			current
				? {
						...current,
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
					className="inline-flex min-h-10 items-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-950 hover:bg-slate-200"
					to="/kindle/setup"
				>
					Set up Kindle sync
				</Link>
				<Link
					className="inline-flex min-h-10 items-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-950 hover:bg-slate-200"
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
								className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
								key={book.asin}
							>
								<div className="flex items-start justify-between gap-4">
									<div>
										<h2 className="font-medium text-slate-950">{book.title}</h2>
										<p className="mt-1 text-sm text-slate-600">{book.author}</p>
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
								<details className="mt-5 border-t border-slate-200 pt-4">
									<summary className="cursor-pointer text-sm font-medium text-slate-700">
										View notes and highlights
									</summary>
									<div className="mt-4 grid gap-4">
										{book.annotations.map((annotation) => (
											<div
												className="rounded-xl bg-slate-50 p-4"
												key={annotation.id}
											>
												{annotation.highlight ? (
													<blockquote className="border-l-2 border-amber-400 pl-4 leading-7 text-slate-800">
														{annotation.highlight}
													</blockquote>
												) : null}
												{annotation.note ? (
													<p className="mt-4 rounded-lg bg-slate-100 p-3 leading-7 text-slate-800">
														{annotation.note}
													</p>
												) : null}
												<div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
													<span>
														{annotation.location
															? `Location ${annotation.location}`
															: annotation.page
																? `Page ${annotation.page}`
																: ""}
													</span>
													<Button
														onClick={() =>
															void archiveAnnotation(annotation.id)
														}
													>
														Archive note
													</Button>
												</div>
											</div>
										))}
									</div>
								</details>
							</article>
						))}
						{books.length === 0 ? (
							<p className="text-slate-600">No books match this search.</p>
						) : null}
					</div>
				</>
			) : null}
		</section>
	);
}
