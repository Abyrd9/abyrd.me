import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";
import { KindleDraftContext } from "#/components/KindleDraftContext";
import { KindleEditor } from "#/components/KindleEditor";
import {
	loadKindleLibrary,
	updateKindlePersonal,
} from "#/server/kindle-functions";

export const Route = createFileRoute(
	"/_authenticated/kindle/synopsis/$asin/$target",
)({
	validateSearch: (search: Record<string, unknown>) => ({
		from:
			search.from === "archived" ? ("archived" as const) : ("library" as const),
	}),
	component: SynopsisPage,
});

function SynopsisPage() {
	const { asin, target } = Route.useParams();
	const { from } = Route.useSearch();
	const [library, setLibrary] = useState<Awaited<
		ReturnType<typeof loadKindleLibrary>
	> | null>(null);
	const [error, setError] = useState(false);
	const [dirty, setDirty] = useState(false);
	const drafts = useContext(KindleDraftContext);
	if (!drafts) throw new Error("Kindle draft context is missing.");
	const key = `${asin}:synopsis:${target}`;

	useBlocker({
		shouldBlockFn: () => {
			if (!dirty) return false;
			if (!confirm("You have unsaved notes. Leave without saving?"))
				return true;
			drafts.current.delete(key);
			return false;
		},
		enableBeforeUnload: () => dirty,
	});

	useEffect(() => {
		void loadKindleLibrary()
			.then(setLibrary)
			.catch(() => setError(true));
	}, []);

	const book = library?.books.find((item) => item.asin === asin);
	const chapter =
		target === "book"
			? null
			: library?.chapters.find(
					(item) => item.bookAsin === asin && String(item.id) === target,
				);
	const missing = library && (!book || (target !== "book" && !chapter));

	return (
		<section className="flex flex-1 flex-col py-8 sm:py-12">
			<Link
				to={from === "archived" ? "/kindle/archived" : "/kindle"}
				hash={`book-${asin}`}
				className="w-fit text-sm text-slate-600 underline underline-offset-4 hover:text-slate-950"
			>
				← Back to Kindle library
			</Link>
			{error && (
				<p role="alert" className="mt-8 text-red-700">
					Could not load your synopsis. Refresh and try again.
				</p>
			)}
			{!library && !error && (
				<p className="mt-8 text-slate-600">Loading synopsis…</p>
			)}
			{missing && (
				<p className="mt-8 text-slate-600">
					This book or chapter could not be found.
				</p>
			)}
			{book && !missing && (
				<div className="mt-8">
					<p className="text-sm font-medium text-slate-600">{book.title}</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
						{chapter ? chapter.title : "Book synopsis"}
					</h1>
					{chapter && (
						<p className="mt-2 text-sm text-slate-600">Chapter synopsis</p>
					)}
					<KindleEditor
						key={key}
						fullPage
						label={chapter ? `Synopsis for ${chapter.title}` : "Book synopsis"}
						content={chapter ? chapter.synopsis : book.synopsis}
						onDirtyChange={(value) => {
							setDirty(value);
							if (value) drafts.current.add(key);
							else drafts.current.delete(key);
						}}
						onSave={async (content, previous) => {
							await updateKindlePersonal({
								data: chapter
									? { action: "saveChapter", id: chapter.id, content, previous }
									: { action: "saveBook", asin: book.asin, content, previous },
							});
						}}
					/>
				</div>
			)}
		</section>
	);
}
