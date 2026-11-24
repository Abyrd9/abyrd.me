import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";
import {
	createWriting,
	deleteWriting,
	listWritings,
	updateWriting,
} from "#/server/writings-functions";

export const Route = createFileRoute("/_authenticated/writing")({
	head: () => ({ meta: [{ title: "Writing - Andrew Byrd" }] }),
	component: WritingsLibrary,
});

type Writing = Awaited<ReturnType<typeof listWritings>>[number];

const sorts = {
	edited: {
		label: "Last edited",
		compare: (a: Writing, b: Writing) => b.updatedAt - a.updatedAt,
	},
	newest: {
		label: "Newest",
		compare: (a: Writing, b: Writing) => b.createdAt - a.createdAt,
	},
	oldest: {
		label: "Oldest",
		compare: (a: Writing, b: Writing) => a.createdAt - b.createdAt,
	},
	title: {
		label: "Title",
		compare: (a: Writing, b: Writing) => a.title.localeCompare(b.title),
	},
} as const;

type SortId = keyof typeof sorts;

const input =
	"min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200";

function WritingsLibrary() {
	const navigate = useNavigate();
	const [writings, setWritings] = useState<Writing[] | null>(null);
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<SortId>("edited");
	const [newTitle, setNewTitle] = useState("");
	const [renaming, setRenaming] = useState<number | null>(null);
	const [deleting, setDeleting] = useState<number | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		void listWritings()
			.then(setWritings)
			.catch(() =>
				setMessage("Could not load your writing. Refresh and try again."),
			);
	}, []);

	const search = query.trim().toLowerCase();
	const visible = (writings ?? [])
		.filter((writing) => writing.title.toLowerCase().includes(search))
		.sort(sorts[sort].compare);

	async function create() {
		const title = newTitle.trim();
		if (!title) return;
		setMessage(null);
		try {
			const writing = await createWriting({ data: { title } });
			await navigate({
				to: "/writing/$writingId",
				params: { writingId: String(writing.id) },
				search: { chapter: writing.firstChapterId },
			});
		} catch {
			setMessage("Could not create that writing. Please try again.");
		}
	}

	async function rename(writing: Writing, value: string) {
		setRenaming(null);
		const title = value.trim();
		if (!title || title === writing.title) return;
		try {
			const updated = await updateWriting({ data: { id: writing.id, title } });
			setWritings((current) =>
				(current ?? []).map((item) =>
					item.id === writing.id
						? {
								...item,
								title,
								updatedAt: updated?.updatedAt ?? item.updatedAt,
							}
						: item,
				),
			);
		} catch {
			setMessage("Could not rename that writing. Please try again.");
		}
	}

	async function remove(writing: Writing) {
		try {
			await deleteWriting({ data: { id: writing.id } });
			setWritings((current) =>
				(current ?? []).filter((item) => item.id !== writing.id),
			);
			setDeleting(null);
		} catch {
			setMessage("Could not delete that writing. Please try again.");
		}
	}

	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Writing
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Books, essays, and posts.
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					Each writing opens on a quiet page. Add chapters for a book, or keep
					one for a post.
				</p>
			</div>

			<form
				className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end"
				onSubmit={(event) => {
					event.preventDefault();
					void create();
				}}
			>
				<label className="grid flex-1 gap-2 text-sm font-medium text-slate-700">
					Start something new
					<input
						className={input}
						onChange={(event) => setNewTitle(event.target.value)}
						placeholder="Title"
						value={newTitle}
					/>
				</label>
				<Button disabled={!newTitle.trim()} type="submit">
					Create and open
				</Button>
			</form>

			{message ? (
				<p
					className="mt-6 max-w-3xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
					role="alert"
				>
					{message}
				</p>
			) : null}

			<section className="mt-10 max-w-3xl">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<label className="grid flex-1 gap-2 text-sm font-medium text-slate-700">
						Search
						<input
							className={input}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search by title"
							value={query}
						/>
					</label>
					<label className="grid gap-2 text-sm font-medium text-slate-700">
						Sort by
						<select
							className={input}
							onChange={(event) => {
								const next = event.target.value;
								if (next in sorts) setSort(next as SortId);
							}}
							value={sort}
						>
							{Object.entries(sorts).map(([id, { label }]) => (
								<option key={id} value={id}>
									{label}
								</option>
							))}
						</select>
					</label>
				</div>

				{!writings && !message ? (
					<p className="mt-6 text-slate-600">Loading…</p>
				) : null}
				{writings?.length === 0 ? (
					<p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-sm leading-6 text-slate-600">
						Nothing here yet. Name your first writing above to start.
					</p>
				) : writings && visible.length === 0 ? (
					<p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-sm leading-6 text-slate-600">
						No writing matches that search.
					</p>
				) : null}

				<ul className="mt-6 border-t border-slate-200">
					{visible.map((writing) => (
						<li
							className="flex flex-col gap-3 border-b border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between"
							key={writing.id}
						>
							<div className="min-w-0 flex-1">
								{renaming === writing.id ? (
									<input
										aria-label="New title"
										ref={(element) => element?.focus()}
										className={`${input} w-full`}
										defaultValue={writing.title}
										onBlur={(event) => void rename(writing, event.target.value)}
										onKeyDown={(event) => {
											if (event.key === "Enter") event.currentTarget.blur();
											if (event.key === "Escape") setRenaming(null);
										}}
									/>
								) : (
									<Link
										className="font-serif text-lg text-slate-950 hover:underline"
										params={{ writingId: String(writing.id) }}
										search={{ chapter: undefined }}
										to="/writing/$writingId"
									>
										{writing.title}
									</Link>
								)}
								<p className="mt-1 text-sm text-slate-600">
									{[
										`Edited ${formatDate(writing.updatedAt)}`,
										`started ${formatDate(writing.createdAt)}`,
										writing.chapterCount > 1
											? `${writing.chapterCount} chapters`
											: null,
										`${writing.wordCount.toLocaleString()} ${writing.wordCount === 1 ? "word" : "words"}`,
									]
										.filter(Boolean)
										.join(" · ")}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{deleting === writing.id ? (
									<>
										<span className="text-sm text-slate-600">
											Delete it and every chapter?
										</span>
										<Button
											className="bg-red-700 text-white hover:bg-red-800"
											onClick={() => void remove(writing)}
											type="button"
										>
											Delete
										</Button>
										<Button onClick={() => setDeleting(null)} type="button">
											Cancel
										</Button>
									</>
								) : (
									<>
										<Button
											onClick={() => setRenaming(writing.id)}
											type="button"
										>
											Rename
										</Button>
										<Button
											onClick={() => setDeleting(writing.id)}
											type="button"
										>
											Delete
										</Button>
									</>
								)}
							</div>
						</li>
					))}
				</ul>
			</section>
		</section>
	);
}

const formatDate = (time: number) => {
	const date = new Date(time);
	const today = new Date();
	if (date.toDateString() === today.toDateString())
		return `today at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};
