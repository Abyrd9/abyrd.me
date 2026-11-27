import { Combobox } from "@base-ui/react/combobox";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { ProjectNotes } from "#/components/ProjectNotes";
import {
	deleteProject,
	getProject,
	listProjectNotes,
	listProjects,
	renameProject,
	setWritingProject,
} from "#/server/writing-projects-functions";
import { listWritings } from "#/server/writings-functions";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
	loader: async ({ params }) => ({
		project: await getProject({ data: { id: Number(params.projectId) } }),
		writings: await listWritings(),
		projects: await listProjects(),
	}),
	head: () => ({ meta: [{ title: "Project wiki - Andrew Byrd" }] }),
	component: ProjectRoute,
});

function ProjectRoute() {
	const { projectId } = Route.useParams();
	return <ProjectPage key={projectId} />;
}

const ProjectPage = () => {
	const initial = Route.useLoaderData();
	const [project, setProject] = useState(initial.project);
	const [writings, setWritings] = useState(initial.writings);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	if (!project) return <p className="py-12">This project no longer exists.</p>;
	const attach = async (writingId: number, projectId: number | null) => {
		setBusy(true);
		setError(null);
		try {
			await setWritingProject({ data: { writingId, projectId } });
			setWritings(await listWritings());
		} catch {
			setError("Could not update the book's project. Try again.");
		} finally {
			setBusy(false);
		}
	};
	return (
		<section className="flex flex-1 flex-col py-10">
			<Link
				to="/writing"
				className="mb-6 text-sm text-stone-600 hover:underline dark:text-stone-400"
			>
				← Writing shelf
			</Link>
			<input
				aria-label="Project title"
				defaultValue={project.title}
				key={project.title}
				maxLength={300}
				// `!` beats the global `input { font: inherit }` rule.
				className="font-book w-full bg-transparent text-4xl! text-stone-950 outline-none focus-visible:ring-1 focus-visible:ring-stone-400 dark:text-stone-100"
				onKeyDown={(event) => {
					if (event.key === "Enter") event.currentTarget.blur();
				}}
				onBlur={async (event) => {
					const title = event.target.value.trim();
					if (!title || title === project.title) {
						event.target.value = project.title;
						return;
					}
					try {
						await renameProject({ data: { id: project.id, title } });
						setProject({ ...project, title });
					} catch {
						setError("Could not rename the project. Try again.");
					}
				}}
			/>
			{error ? (
				<p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
					{error}
				</p>
			) : null}
			<div className="mt-8 flex flex-1 flex-col gap-10 md:flex-row">
				<aside className="md:w-56 md:shrink-0">
					<h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">
						Books in this project
					</h2>
					<ul className="mt-3 space-y-3">
						{writings
							.filter((writing) => writing.projectId === project.id)
							.map((writing) => (
								<li
									key={writing.id}
									className="flex items-baseline justify-between gap-3"
								>
									<Link
										to="/writing/$writingId"
										params={{ writingId: String(writing.id) }}
										search={{ chapter: undefined }}
										className="font-book hover:underline"
									>
										{writing.title}
									</Link>
									<button
										type="button"
										disabled={busy}
										className="text-xs text-stone-600 hover:underline disabled:opacity-50 dark:text-stone-400"
										onClick={() => void attach(writing.id, null)}
									>
										Detach
									</button>
								</li>
							))}
					</ul>
					<BookPicker
						books={writings.filter(
							(writing) => writing.projectId !== project.id,
						)}
						disabled={busy}
						onPick={(writing) => void attach(writing.id, project.id)}
						projectTitles={
							new Map(initial.projects.map((item) => [item.id, item.title]))
						}
					/>
					<p className="mt-3 text-xs leading-5 text-stone-600 dark:text-stone-400">
						Detaching keeps the project's wiki and the book's local notes.
					</p>
					<DeleteProject projectId={project.id} title={project.title} />
				</aside>
				<div className="min-h-[60vh] min-w-0 flex-1">
					<ProjectNotes key={project.id} projectId={project.id} />
				</div>
			</div>
		</section>
	);
};

type Writing = Awaited<ReturnType<typeof listWritings>>[number];

/** Search the shelf and pick a writing to attach to this project. */
const BookPicker = ({
	books,
	projectTitles,
	disabled,
	onPick,
}: {
	books: Writing[];
	projectTitles: Map<number, string>;
	disabled: boolean;
	onPick: (writing: Writing) => void;
}) => {
	const id = useId();
	// Cleared after each pick, so the box is ready to attach another.
	const [query, setQuery] = useState("");
	return (
		<Combobox.Root
			inputValue={query}
			onInputValueChange={setQuery}
			disabled={disabled || books.length === 0}
			itemToStringLabel={(writing: Writing) => writing.title}
			items={books}
			onValueChange={(writing) => {
				if (!writing) return;
				setQuery("");
				onPick(writing);
			}}
			value={null}
		>
			<div className="mt-6 text-sm">
				<label
					className="block text-slate-600 dark:text-slate-400"
					htmlFor={id}
				>
					Attach a writing
				</label>
				<Combobox.InputGroup className="mt-2 flex items-center gap-2 border-b border-slate-300 pb-1 focus-within:border-slate-700 data-[disabled]:opacity-50">
					<svg
						aria-hidden="true"
						className="shrink-0 text-slate-500"
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
					<Combobox.Input
						id={id}
						className="min-h-9 w-full min-w-0 bg-transparent text-slate-950 outline-none placeholder:text-slate-500 any-pointer-coarse:text-base"
						placeholder={
							books.length ? "Find a writing" : "Every writing is here"
						}
					/>
					<Combobox.Trigger
						aria-label="Show writings"
						className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#262626] dark:hover:text-slate-100"
					>
						<svg
							aria-hidden="true"
							fill="none"
							height="14"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="14"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</Combobox.Trigger>
				</Combobox.InputGroup>
			</div>
			<Combobox.Portal>
				<Combobox.Positioner
					align="start"
					className="z-50 outline-none"
					sideOffset={6}
				>
					<Combobox.Popup className="w-[max(var(--anchor-width),16rem)] max-w-[var(--available-width)] origin-[var(--transform-origin)] rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg transition-[scale,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none dark:border-slate-700">
						<Combobox.Empty>
							<p className="px-3 py-2 text-slate-500">
								No writing has that title.
							</p>
						</Combobox.Empty>
						<Combobox.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain outline-none">
							{(writing: Writing) => (
								<Combobox.Item
									className="flex cursor-default items-center gap-3 rounded-md px-2.5 py-2 text-slate-700 outline-none select-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 dark:text-slate-300 dark:data-[highlighted]:bg-[#262626] dark:data-[highlighted]:text-slate-100"
									key={writing.id}
									value={writing}
								>
									<span
										aria-hidden="true"
										className="h-6 w-[18px] shrink-0 rounded-[1px] bg-[#fff] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#525252]"
									/>
									<span className="min-w-0 flex-1">
										<span className="font-book block truncate text-[15px]">
											{writing.title}
										</span>
										<span className="block truncate text-xs text-slate-500 tabular-nums">
											{writing.projectId
												? `Moves from ${projectTitles.get(writing.projectId) ?? "another project"}`
												: `${writing.wordCount.toLocaleString()} ${writing.wordCount === 1 ? "word" : "words"}`}
										</span>
									</span>
								</Combobox.Item>
							)}
						</Combobox.List>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
};

/**
 * Deletes the project after an inline confirmation that says what happens to
 * its books and notes.
 */
const DeleteProject = ({
	projectId,
	title,
}: {
	projectId: number;
	title: string;
}) => {
	const navigate = useNavigate();
	// null until asked; then how many notes exist only in the wiki.
	const [wikiOnly, setWikiOnly] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	const ask = async () => {
		setBusy(true);
		setFailed(false);
		try {
			const notes = await listProjectNotes({ data: { projectId } });
			setWikiOnly(notes.filter((note) => note.writingId === null).length);
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	};

	const remove = async () => {
		setBusy(true);
		setFailed(false);
		try {
			await deleteProject({ data: { id: projectId } });
			await navigate({ to: "/writing" });
		} catch {
			setFailed(true);
			setBusy(false);
		}
	};

	return (
		<div className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
			{wikiOnly === null ? (
				<button
					className="text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
					disabled={busy}
					onClick={() => void ask()}
					type="button"
				>
					Delete project…
				</button>
			) : (
				<div role="alert">
					<p className="leading-5">
						Delete “{title}”? Its books stay on your shelf, and notes shared
						from a book stay with that book.{" "}
						{wikiOnly
							? `${wikiOnly} ${wikiOnly === 1 ? "note that lives" : "notes that live"} only in the wiki will be deleted for good.`
							: "No wiki notes will be lost."}
					</p>
					<div className="mt-2 flex gap-4">
						<button
							className="font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
							disabled={busy}
							onClick={() => void remove()}
							type="button"
						>
							{busy ? "Deleting…" : "Delete project"}
						</button>
						<button
							className="hover:underline disabled:opacity-50"
							disabled={busy}
							onClick={() => setWikiOnly(null)}
							type="button"
						>
							Keep it
						</button>
					</div>
				</div>
			)}
			{failed ? (
				<p className="mt-2 text-red-700 dark:text-red-400">
					Could not delete the project. Please try again.
				</p>
			) : null}
		</div>
	);
};
