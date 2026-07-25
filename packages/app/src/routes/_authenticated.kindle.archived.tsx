import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";
import {
	loadArchivedKindleLibrary,
	updateKindleArchive,
} from "#/server/kindle-functions";

export const Route = createFileRoute("/_authenticated/kindle/archived")({
	component: ArchivedKindleAnnotations,
});

function ArchivedKindleAnnotations() {
	const [annotations, setAnnotations] = useState<
		Awaited<ReturnType<typeof loadArchivedKindleLibrary>>["annotations"]
	>([]);
	useEffect(() => {
		void loadArchivedKindleLibrary().then((library) =>
			setAnnotations(library.annotations),
		);
	}, []);
	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
				Kindle library
			</p>
			<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
				Archived highlights.
			</h1>
			<div className="mt-8 grid gap-4">
				{annotations.map((annotation) => (
					<article
						className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
						key={annotation.id}
					>
						<p className="font-medium">{annotation.title}</p>
						<p className="mt-3 leading-7">
							{annotation.highlight ?? annotation.note}
						</p>
						<Button
							className="mt-4"
							onClick={() =>
								void updateKindleArchive({
									data: { id: annotation.id, archived: false },
								}).then(() =>
									setAnnotations((current) =>
										current.filter((item) => item.id !== annotation.id),
									),
								)
							}
						>
							Restore
						</Button>
					</article>
				))}
				{annotations.length === 0 ? (
					<p className="text-slate-600">Nothing is archived.</p>
				) : null}
			</div>
		</section>
	);
}
