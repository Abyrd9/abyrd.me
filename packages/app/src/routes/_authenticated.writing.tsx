import { Menu } from "@base-ui/react/menu";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
	createProject,
	listProjects,
} from "#/server/writing-projects-functions";
import {
	deleteWritingTrash,
	listWritingTrash,
	restoreWritingTrash,
} from "#/server/writing-trash-functions";
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
	const [trash, setTrash] = useState<
		Awaited<ReturnType<typeof listWritingTrash>>
	>([]);
	const [busy, setBusy] = useState(false);
	const [projects, setProjects] = useState<Awaited<
		ReturnType<typeof listProjects>
	> | null>(null);

	useEffect(() => {
		void listProjects()
			.then(setProjects)
			.catch(() =>
				setMessage("Could not load projects. Refresh and try again."),
			);
		void listWritingTrash()
			.then(setTrash)
			.catch(() => setMessage("Could not load Trash. Refresh and try again."));
		void listWritings()
			.then(setWritings)
			.catch(() =>
				setMessage("Could not load your writing. Refresh and try again."),
			);
	}, []);

	const search = query.trim().toLowerCase();
	const visibleProjects = projects?.filter((project) =>
		project.title.toLowerCase().includes(search),
	);
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

	async function createNewProject(title: string) {
		setMessage(null);
		try {
			const project = await createProject({ data: { title } });
			await navigate({
				to: "/projects/$projectId",
				params: { projectId: String(project.id) },
			});
		} catch {
			setMessage("Could not create the project. Please try again.");
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

	async function changeTrash(id: number, restore: boolean) {
		if (
			!restore &&
			!confirm("Delete this item forever? This cannot be undone.")
		)
			return;
		setBusy(true);
		setMessage(null);
		try {
			if (restore) {
				const restored = await restoreWritingTrash({ data: { id } });
				if (!restored)
					setMessage("That item has expired or is no longer in Trash.");
				setWritings(await listWritings());
			} else await deleteWritingTrash({ data: { id } });
			setTrash(await listWritingTrash());
		} catch {
			setMessage(
				"Could not update Trash. Its writing may no longer exist. Please try again.",
			);
		} finally {
			setBusy(false);
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
				{writings?.length || projects?.length ? (
					<div className="flex flex-wrap items-center gap-4 text-sm">
						<label className="flex min-w-0 items-center gap-2 border-b border-slate-300 pb-1 text-slate-500 focus-within:border-slate-700">
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
							<span className="sr-only">
								Search writing and projects by title
							</span>
							<input
								className="w-36 min-w-0 bg-transparent text-slate-950 outline-none placeholder:text-slate-500 sm:w-40"
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search"
								value={query}
							/>
						</label>
						{writings?.length ? (
							<label className="flex items-center gap-1 text-slate-500">
								<span className="sr-only">Sort writing by</span>
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
						) : null}
					</div>
				) : null}
			</header>

			<section aria-labelledby="projects-heading" className="mt-10">
				<h2 className="font-book text-xl text-slate-950" id="projects-heading">
					Projects
				</h2>
				{projects ? (
					<ul className={`mt-6 ${shelfGrid}`}>
						{search ? null : (
							<li>
								<NewFolder onCreate={createNewProject} />
							</li>
						)}
						{visibleProjects?.map((project) => (
							<li key={project.id}>
								<ProjectFolder
									books={(writings ?? []).filter(
										(writing) => writing.projectId === project.id,
									)}
									project={project}
								/>
							</li>
						))}
					</ul>
				) : null}
				{search && projects?.length && !visibleProjects?.length ? (
					<p className="text-sm text-slate-500">
						No project has “{query.trim()}” in its title.
					</p>
				) : null}
			</section>

			<h2 className="font-book mt-12 text-xl text-slate-950">Writings</h2>

			{message ? (
				<p
					className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
					role="alert"
				>
					{message}
				</p>
			) : null}

			{writings && (!search || visible.length > 0) ? (
				<ul className={`mt-0 ${shelfGrid}`}>
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
			) : writings || message ? null : (
				<p className="mt-12 text-sm text-slate-500">Loading…</p>
			)}

			{writings?.length === 0 && !search ? (
				<p className="mt-8 max-w-sm text-sm leading-6 text-slate-500">
					Your shelf is empty. Give the blank page a title to start your first
					book, essay, or post.
				</p>
			) : search && visible.length === 0 ? (
				<p className="mt-8 text-sm text-slate-500">
					No writing has “{query.trim()}” in its title.
				</p>
			) : null}
			{trash.length ? (
				<details className="mt-14 border-t border-stone-200 pt-5 text-sm text-stone-500">
					<summary className="w-fit cursor-pointer hover:text-stone-800">
						Trash ({trash.length})
					</summary>
					<p className="mt-3 text-xs">
						Items are deleted forever after 30 days.
					</p>
					<ul className="mt-3 divide-y divide-stone-200">
						{trash.map((item) => {
							const days = Math.max(
								0,
								Math.floor((Date.now() - item.deletedAt) / 86_400_000),
							);
							return (
								<li
									className="flex flex-wrap items-center justify-between gap-3 py-4"
									key={item.id}
								>
									<div>
										<p className="text-stone-800">{item.title || "Untitled"}</p>
										<p className="mt-1 text-xs">
											{item.kind === "writing"
												? "Book"
												: `${item.kind === "chapter" ? "Chapter of" : "Note in"} ${item.writingTitle}`}{" "}
											· Deleted{" "}
											{days === 0
												? "today"
												: `${days} ${days === 1 ? "day" : "days"} ago`}
										</p>
									</div>
									<div className="flex gap-4 text-xs">
										<button
											className="hover:text-stone-900 hover:underline disabled:opacity-50"
											disabled={busy}
											onClick={() => void changeTrash(item.id, true)}
											type="button"
										>
											Restore
										</button>
										<button
											className="hover:text-red-700 hover:underline disabled:opacity-50"
											disabled={busy}
											onClick={() => void changeTrash(item.id, false)}
											type="button"
										>
											Delete forever
										</button>
									</div>
								</li>
							);
						})}
					</ul>
				</details>
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

/** Projects and writings share one grid, so folders line up with sheets. */
const shelfGrid =
	"grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-y-12 sm:grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))]";

const FOLDER_HEIGHT = 112;
/** Folder back with a tab on the left; the front panel covers its lower part. */
const folderBack =
	"polygon(0 6px, 6px 0, 38% 0, calc(38% + 12px) 12px, 100% 12px, 100% 100%, 0 100%)";
const folderShadow =
	"[filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.08))_drop-shadow(0_6px_10px_rgba(0,0,0,0.06))]";

type Project = NonNullable<Awaited<ReturnType<typeof listProjects>>>[number];

/** A paper folder; its writings show as sheets tucked inside. */
const Folder = ({
	sheets,
	className = "",
	dashed = false,
	children,
}: {
	sheets: number;
	className?: string;
	dashed?: boolean;
	children?: ReactNode;
}) => (
	<div
		className={`relative w-full max-w-[13rem] ${dashed ? "" : folderShadow} ${className}`}
		style={{ height: FOLDER_HEIGHT }}
	>
		{dashed ? (
			<svg
				aria-hidden="true"
				className="absolute inset-0 size-full overflow-visible"
				preserveAspectRatio="none"
				viewBox="0 0 208 112"
			>
				<path
					d="M0.5 6.5 L6.5 0.5 H79 L91 12.5 H207.5 V111.5 H0.5 Z"
					fill="none"
					stroke="currentColor"
					strokeDasharray="4 3"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		) : (
			<>
				<div
					className="absolute inset-0 bg-slate-200"
					style={{ clipPath: folderBack }}
				/>
				{Array.from({ length: Math.min(sheets, 3) }, (_, index) => (
					<div
						className="absolute bottom-2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
						// biome-ignore lint/suspicious/noArrayIndexKey: sheets are interchangeable.
						key={index}
						style={{
							top: 18 - index * 4,
							left: 10 + index * 8,
							right: 22 - index * 6,
						}}
					/>
				))}
				<div className="absolute inset-x-0 bottom-0 h-[72%] rounded-b-[2px] bg-white shadow-[0_-1px_0_rgba(0,0,0,0.05)]" />
			</>
		)}
		{children}
	</div>
);

const ProjectFolder = ({
	project,
	books,
}: {
	project: Project;
	books: Writing[];
}) => {
	const params = { projectId: String(project.id) };
	return (
		<article className="group pr-4 sm:pr-8">
			<Link
				aria-label={`Open ${project.title}`}
				className="block max-w-[13rem] rounded-[2px] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 motion-reduce:transition-none"
				params={params}
				to="/projects/$projectId"
			>
				<Folder sheets={books.length} />
			</Link>
			<div className="-mr-4 border-b border-slate-200 sm:-mr-8 dark:border-slate-800" />
			<Link
				className="font-book mt-4 line-clamp-2 text-[15px] leading-snug text-slate-950 hover:underline"
				params={params}
				to="/projects/$projectId"
			>
				{project.title}
			</Link>
			<p className="mt-1 truncate text-xs text-slate-500 tabular-nums">
				{books.length
					? `${books.length} ${books.length === 1 ? "writing" : "writings"} · ${books.map((book) => book.title).join(", ")}`
					: "Wiki only, no writings yet"}
			</p>
		</article>
	);
};

const NewFolder = ({ onCreate }: { onCreate: (title: string) => void }) => {
	const [naming, setNaming] = useState(false);
	const [title, setTitle] = useState("");
	if (!naming)
		return (
			<button
				className="group block w-full pr-4 text-left focus-visible:outline-none sm:pr-8"
				onClick={() => setNaming(true)}
				type="button"
			>
				<Folder
					className="grid place-items-center text-slate-300 transition-colors group-hover:text-slate-500 group-focus-visible:text-slate-700"
					dashed
					sheets={0}
				>
					<svg
						aria-hidden="true"
						className="relative mt-3 text-slate-400 group-hover:text-slate-700"
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
				</Folder>
				<span className="-mr-4 block border-b border-slate-200 sm:-mr-8 dark:border-slate-800" />
				<span className="font-book mt-4 block text-[15px] text-slate-600 group-hover:text-slate-950">
					New project
				</span>
				<span className="mt-1 block text-xs text-slate-400">
					A shared wiki for a world or series
				</span>
			</button>
		);

	return (
		<form
			className="pr-4 sm:pr-8"
			onSubmit={(event) => {
				event.preventDefault();
				if (title.trim()) onCreate(title.trim());
			}}
		>
			<Folder sheets={0} />
			<div className="-mr-4 border-b border-slate-200 sm:-mr-8 dark:border-slate-800" />
			<input
				aria-label="Project title"
				className="font-book mt-4 w-full border-b border-slate-400 bg-transparent text-[15px] text-slate-950 outline-none placeholder:text-slate-400"
				maxLength={300}
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
				Press Enter to open its wiki
			</p>
		</form>
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
										// biome-ignore lint/suspicious/noArrayIndexKey: preview blocks never reorder.
										<p className="mb-[0.75em]" key={index}>
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
