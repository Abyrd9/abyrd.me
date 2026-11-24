import { Menu } from "@base-ui/react/menu";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
	createWriting,
	deleteWriting,
	listWritings,
	updateWriting,
} from "#/server/writings-functions";
import { type PageSizeId, pageSizes, toPageSizeId } from "#/writing-page-sizes";

export const Route = createFileRoute("/_authenticated/writing")({
	head: () => ({ meta: [{ title: "Writing - Andrew Byrd" }] }),
	component: WritingShelf,
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

/** Thumbnails are drawn at this many pixels per printed inch. */
const SHELF_PX_PER_INCH = 24;
/** Tall enough for the largest page size, so every sheet rests on one line. */
const SHELF_HEIGHT = Math.max(
	...Object.values(pageSizes).map((size) => size.height * SHELF_PX_PER_INCH),
);

function WritingShelf() {
	const navigate = useNavigate();
	const [writings, setWritings] = useState<Writing[] | null>(null);
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<SortId>("edited");
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
	const totalWords = (writings ?? []).reduce(
		(total, writing) => total + writing.wordCount,
		0,
	);

	async function create(title: string) {
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

	async function rename(writing: Writing, title: string) {
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
		} catch {
			setMessage("Could not delete that writing. Please try again.");
		}
	}

	return (
		<section className="flex flex-1 flex-col py-10 sm:py-14">
			<header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-book text-4xl text-slate-950">Writing</h1>
					{writings?.length ? (
						<p className="mt-2 text-sm text-slate-500 tabular-nums">
							{writings.length} {writings.length === 1 ? "writing" : "writings"}{" "}
							· {totalWords.toLocaleString()}{" "}
							{totalWords === 1 ? "word" : "words"}
						</p>
					) : null}
				</div>
				{writings?.length ? (
					<div className="flex items-center gap-4 text-sm">
						<label className="flex items-center gap-2 border-b border-slate-300 pb-1 text-slate-500 focus-within:border-slate-700">
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
								<circle cx="11" cy="11" r="7" />
								<path d="m20 20-3.5-3.5" />
							</svg>
							<span className="sr-only">Search by title</span>
							<input
								className="w-40 bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search"
								value={query}
							/>
						</label>
						<label className="flex items-center gap-1 text-slate-500">
							<span className="sr-only">Sort by</span>
							<select
								className="cursor-pointer bg-transparent py-1 text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
				) : null}
			</header>

			{message ? (
				<p
					className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
					role="alert"
				>
					{message}
				</p>
			) : null}

			{writings ? (
				<ul className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))] gap-y-12">
					{search ? null : (
						<li>
							<NewSheet onCreate={create} />
						</li>
					)}
					{visible.map((writing) => (
						<li key={writing.id}>
							<WritingSheet
								onDelete={() => void remove(writing)}
								onRename={(title) => void rename(writing, title)}
								writing={writing}
							/>
						</li>
					))}
				</ul>
			) : message ? null : (
				<p className="mt-12 text-sm text-slate-500">Loading…</p>
			)}

			{writings?.length === 0 ? (
				<p className="mt-8 max-w-sm text-sm leading-6 text-slate-500">
					Your shelf is empty. Give the blank page a title to start your first
					book, essay, or post.
				</p>
			) : search && visible.length === 0 ? (
				<p className="mt-8 text-sm text-slate-500">
					No writing has “{query.trim()}” in its title.
				</p>
			) : null}
		</section>
	);
}

/** The strip each sheet stands on. Neighboring strips join into one shelf line. */
const Shelf = ({ children }: { children: ReactNode }) => (
	<div
		// Phones get a smaller shelf so two writings fit side by side.
		className="flex items-end border-b border-slate-200 max-sm:[zoom:0.72] dark:border-slate-800"
		style={{ height: SHELF_HEIGHT }}
	>
		{children}
	</div>
);

/** A sheet drawn at its writing's printed trim size. */
const Sheet = ({
	pageSize,
	className = "",
	children,
}: {
	pageSize: PageSizeId;
	className?: string;
	children: ReactNode;
}) => {
	const size = pageSizes[pageSize];
	return (
		<div
			className={`relative overflow-hidden ${className}`}
			style={{
				width: size.width * SHELF_PX_PER_INCH,
				height: size.height * SHELF_PX_PER_INCH,
				padding: size.margin * SHELF_PX_PER_INCH,
			}}
		>
			{children}
		</div>
	);
};

const paper =
	"bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_16px_rgba(0,0,0,0.06)]";

const TitlePage = ({ title }: { title: string }) => (
	<p className="font-book mt-[28%] text-center text-[9px] leading-snug text-stone-800 dark:text-stone-200">
		{title}
	</p>
);

const WritingSheet = ({
	writing,
	onRename,
	onDelete,
}: {
	writing: Writing;
	onRename: (title: string) => void;
	onDelete: () => void;
}) => {
	const [mode, setMode] = useState<"idle" | "renaming" | "deleting">("idle");
	const pageSize = toPageSizeId(writing.pageSize);
	const to = "/writing/$writingId";
	const params = { writingId: String(writing.id) };
	const search = { chapter: undefined };

	return (
		<article className="group">
			<Shelf>
				<Link
					aria-label={`Open ${writing.title}`}
					className="block rounded-[1px] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 motion-reduce:transition-none"
					params={params}
					search={search}
					to={to}
				>
					<Sheet
						className={`${paper} transition-shadow group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_14px_28px_rgba(0,0,0,0.10)]`}
						pageSize={pageSize}
					>
						{writing.preview.length ? (
							<div
								aria-hidden="true"
								className="font-book text-[5.5px] leading-[1.55] text-stone-600 dark:text-stone-400"
							>
								{writing.preview.map((block, index) =>
									block.kind === "heading" ? (
										<p
											className="mb-[0.6em] text-[7px] font-semibold text-stone-900 dark:text-stone-100"
											// biome-ignore lint/suspicious/noArrayIndexKey: preview blocks never reorder.
											key={index}
										>
											{block.text}
										</p>
									) : (
										<p
											className={
												// Matches the editor's book-style indents.
												block.kind === "paragraph" &&
												writing.preview[index - 1]?.kind === "paragraph"
													? "indent-[1.5em]"
													: ""
											}
											// biome-ignore lint/suspicious/noArrayIndexKey: preview blocks never reorder.
											key={index}
										>
											{block.text}
										</p>
									),
								)}
							</div>
						) : (
							<TitlePage title={writing.title} />
						)}
					</Sheet>
				</Link>
			</Shelf>

			<div className="mt-4 flex items-start justify-between gap-2 pr-4 sm:pr-8">
				{mode === "renaming" ? (
					<input
						aria-label="New title"
						className="font-book min-w-0 flex-1 border-b border-slate-400 bg-transparent text-[15px] text-slate-950 outline-none"
						defaultValue={writing.title}
						onBlur={(event) => {
							const title = event.target.value.trim();
							setMode("idle");
							if (title && title !== writing.title) onRename(title);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.currentTarget.blur();
							if (event.key === "Escape") {
								event.currentTarget.value = writing.title;
								event.currentTarget.blur();
							}
						}}
						ref={(element) => element?.focus()}
					/>
				) : (
					<Link
						className="font-book line-clamp-2 min-w-0 text-[15px] leading-snug text-slate-950 hover:underline"
						params={params}
						search={search}
						to={to}
					>
						{writing.title}
					</Link>
				)}
				<Menu.Root>
					<Menu.Trigger
						aria-label={`Options for ${writing.title}`}
						className="-mt-0.5 -mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-900 focus-visible:opacity-100 data-[popup-open]:opacity-100 max-sm:opacity-100"
					>
						<svg
							aria-hidden="true"
							fill="currentColor"
							height="16"
							viewBox="0 0 24 24"
							width="16"
						>
							<circle cx="5" cy="12" r="1.8" />
							<circle cx="12" cy="12" r="1.8" />
							<circle cx="19" cy="12" r="1.8" />
						</svg>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Positioner align="end" sideOffset={4}>
							<Menu.Popup className="min-w-36 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg outline-none">
								<Menu.Item
									className="cursor-pointer rounded-md px-3 py-1.5 text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950"
									onClick={() => setMode("renaming")}
								>
									Rename
								</Menu.Item>
								<Menu.Item
									className="cursor-pointer rounded-md px-3 py-1.5 text-red-700 outline-none data-[highlighted]:bg-red-50"
									onClick={() => setMode("deleting")}
								>
									Delete…
								</Menu.Item>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
			</div>

			{mode === "deleting" ? (
				<div className="mt-1 pr-4 sm:pr-8 text-xs text-slate-600">
					<p>Delete it and every chapter?</p>
					<div className="mt-1.5 flex gap-3">
						<button
							className="font-medium text-red-700 hover:underline"
							onClick={() => {
								setMode("idle");
								onDelete();
							}}
							type="button"
						>
							Delete
						</button>
						<button
							className="text-slate-600 hover:underline"
							onClick={() => setMode("idle")}
							type="button"
						>
							Keep
						</button>
					</div>
				</div>
			) : (
				<p className="mt-1 pr-4 sm:pr-8 text-xs text-slate-500 tabular-nums">
					{[
						`${writing.wordCount.toLocaleString()} ${writing.wordCount === 1 ? "word" : "words"}`,
						writing.chapterCount > 1
							? `${writing.chapterCount} chapters`
							: null,
						formatDate(writing.updatedAt),
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
			)}
		</article>
	);
};

/** A blank trade-size sheet. Naming it creates the writing and opens it. */
const NewSheet = ({ onCreate }: { onCreate: (title: string) => void }) => {
	const [naming, setNaming] = useState(false);
	const [title, setTitle] = useState("");
	if (!naming)
		return (
			<button
				className="group block w-full text-left focus-visible:outline-none"
				onClick={() => setNaming(true)}
				type="button"
			>
				<Shelf>
					<Sheet
						className="grid place-items-center border border-dashed border-slate-300 text-slate-400 transition-colors group-hover:border-slate-500 group-hover:text-slate-700 group-focus-visible:border-slate-700 group-focus-visible:text-slate-900"
						pageSize="trade"
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="22"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="1.5"
							viewBox="0 0 24 24"
							width="22"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
					</Sheet>
				</Shelf>
				<span className="font-book mt-4 block text-[15px] text-slate-600 group-hover:text-slate-950">
					New writing
				</span>
				<span className="mt-1 block text-xs text-slate-400">
					A book, essay, or post
				</span>
			</button>
		);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (title.trim()) onCreate(title.trim());
			}}
			className="pr-4 sm:pr-8"
		>
			<Shelf>
				<Sheet className={paper} pageSize="trade">
					{title.trim() ? (
						<TitlePage title={title} />
					) : (
						<p className="font-book mt-[28%] text-center text-[9px] text-stone-300">
							Untitled
						</p>
					)}
				</Sheet>
			</Shelf>
			<input
				aria-label="Title"
				className="font-book mt-4 w-full border-b border-slate-400 bg-transparent text-[15px] text-slate-950 outline-none placeholder:text-slate-400"
				onBlur={() => {
					if (!title.trim()) setNaming(false);
				}}
				onChange={(event) => setTitle(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						setTitle("");
						setNaming(false);
					}
				}}
				placeholder="Title"
				ref={(element) => element?.focus()}
				value={title}
			/>
			<p className="mt-1 text-xs text-slate-400">
				Press Enter to start writing
			</p>
		</form>
	);
};

const formatDate = (time: number) => {
	const date = new Date(time);
	const today = new Date();
	if (date.toDateString() === today.toDateString())
		return `today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
	});
};
