import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProjectNotes } from "#/components/ProjectNotes";
import {
	getProject,
	renameProject,
	setWritingProject,
} from "#/server/writing-projects-functions";
import { listWritings } from "#/server/writings-functions";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
	loader: async ({ params }) => ({
		project: await getProject({ data: { id: Number(params.projectId) } }),
		writings: await listWritings(),
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
				className="font-book w-full bg-transparent text-3xl text-stone-950 outline-none focus-visible:ring-1 focus-visible:ring-stone-400 dark:text-stone-100"
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
					<label className="mt-6 block text-sm text-stone-600 dark:text-stone-400">
						Attach a book
						<select
							disabled={busy}
							value=""
							className="mt-2 block w-full rounded border border-stone-300 bg-transparent p-2 text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							onChange={(event) => {
								if (event.target.value)
									void attach(Number(event.target.value), project.id);
							}}
						>
							<option value="">Choose a book…</option>
							{writings
								.filter((writing) => writing.projectId !== project.id)
								.map((writing) => (
									<option key={writing.id} value={writing.id}>
										{writing.title}
										{writing.projectId ? " (move from another project)" : ""}
									</option>
								))}
						</select>
					</label>
					<p className="mt-3 text-xs leading-5 text-stone-600 dark:text-stone-400">
						Detaching keeps the project's wiki and the book's local notes.
					</p>
				</aside>
				<div className="min-h-[60vh] min-w-0 flex-1">
					<ProjectNotes key={project.id} projectId={project.id} />
				</div>
			</div>
		</section>
	);
};
