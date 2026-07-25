import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "#/components/primitives/button";
import {
	loadKindleLibrary,
	updateKindleArchive,
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

	const annotations = useMemo(
		() =>
			library?.annotations.filter((annotation) =>
				`${annotation.title} ${annotation.author} ${annotation.highlight ?? ""} ${annotation.note ?? ""}`
					.toLowerCase()
					.includes(query.trim().toLowerCase()),
			) ?? [],
		[library, query],
	);

	async function archive(id: number) {
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
			{message ? <p className="mt-8 text-red-700">{message}</p> : null}
			{!library && !message ? (
				<p className="mt-8 text-slate-600">Loading Kindle library…</p>
			) : null}
			{library ? (
				<>
					<p className="mt-8 text-sm text-slate-600">
						{library.lastSync
							? `Last sync: ${library.lastSync.status}.`
							: "Set up the extension to import your Kindle library."}
					</p>
					<label className="mt-5 grid max-w-xl gap-2 text-sm font-medium text-slate-700">
						Search highlights
						<input
							className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Book, highlight, or note"
							value={query}
						/>
					</label>
					<div className="mt-8 grid gap-4">
						{annotations.map((annotation) => (
							<article
								className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
								key={annotation.id}
							>
								<p className="text-sm font-medium text-slate-700">
									{annotation.title}
								</p>
								<p className="text-sm text-slate-600">{annotation.author}</p>
								{annotation.highlight ? (
									<blockquote className="mt-4 border-l-2 border-amber-400 pl-4 leading-7 text-slate-800">
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
									<Button onClick={() => void archive(annotation.id)}>
										Archive
									</Button>
								</div>
							</article>
						))}
						{annotations.length === 0 ? (
							<p className="text-slate-600">
								No visible highlights match this search.
							</p>
						) : null}
					</div>
				</>
			) : null}
		</section>
	);
}
