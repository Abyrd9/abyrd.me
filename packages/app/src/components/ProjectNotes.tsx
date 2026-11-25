import { type ReactNode, useEffect, useState } from "react";
import { NotePane } from "#/components/NotePane";
import {
	createProjectNote,
	listProjectNotes,
} from "#/server/writing-projects-functions";

type Note = Awaited<ReturnType<typeof listProjectNotes>>[number];

export const ProjectNotes = ({
	projectId,
	currentChapter,
}: {
	projectId: number;
	currentChapter?: { id: number; title: string; position: number };
}) => {
	const [notes, setNotes] = useState<Note[] | null>(null);
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<number | null>(null);
	const [history, setHistory] = useState<number[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let active = true;
		void listProjectNotes({ data: { projectId } })
			.then((items) => {
				if (active) setNotes(items);
			})
			.catch(() => {
				if (active)
					setError("Could not load the project wiki. Refresh and try again.");
			});
		return () => {
			active = false;
		};
	}, [projectId]);

	const refresh = async () =>
		setNotes(await listProjectNotes({ data: { projectId } }));
	const create = async (parentId?: number) => {
		setBusy(true);
		setError(null);
		try {
			const note = await createProjectNote({
				data: { projectId, title: "Untitled", parentId },
			});
			await refresh();
			setHistory([]);
			setOpen(note.id);
		} catch {
			setError("Could not create the note. Please try again.");
		} finally {
			setBusy(false);
		}
	};
	const entries = (parentId: number | null, depth = 0): ReactNode =>
		(notes ?? [])
			.filter((note) =>
				parentId === null
					? note.parentId === null ||
						!notes?.some((parent) => parent.id === note.parentId)
					: note.parentId === parentId,
			)
			.map((note) => (
				<li key={note.id}>
					<div
						className="flex items-center gap-2 py-2"
						style={{ paddingLeft: depth * 16 }}
					>
						<button
							type="button"
							className="font-book min-w-0 flex-1 text-left text-stone-900 hover:underline dark:text-stone-100"
							onClick={() => setOpen(note.id)}
						>
							{note.title || "Untitled"}
						</button>
						<button
							type="button"
							className="px-2 text-sm text-stone-600 hover:text-stone-950 disabled:opacity-50 dark:text-stone-400 dark:hover:text-stone-100"
							aria-label={`Add a sub-note to ${note.title || "Untitled"}`}
							disabled={busy}
							onClick={() => void create(note.id)}
						>
							+
						</button>
					</div>
					<ul>{entries(note.id, depth + 1)}</ul>
				</li>
			));

	if (open !== null)
		return (
			<NotePane
				key={open}
				noteId={open}
				currentChapter={currentChapter}
				wikiNoteIds={new Set((notes ?? []).map((note) => note.id))}
				canGoBack={history.length > 0}
				onBack={() => {
					setOpen(history.at(-1) ?? null);
					setHistory(history.slice(0, -1));
				}}
				onShowContents={() => {
					setOpen(null);
					setHistory([]);
					void refresh().catch(() => setError("Could not refresh the wiki."));
				}}
				onOpenNote={(id) => {
					if (!notes?.some((note) => note.id === id)) return;
					setHistory([...history, open]);
					setOpen(id);
				}}
				onTitleChange={(id, title) =>
					setNotes((items) =>
						(items ?? []).map((note) =>
							note.id === id ? { ...note, title } : note,
						),
					)
				}
				onKeptEdits={() =>
					void refresh().catch(() => setError("Could not refresh the wiki."))
				}
			/>
		);

	const matches = notes?.filter((note) =>
		note.title.toLowerCase().includes(query.trim().toLowerCase()),
	);
	return (
		<section
			aria-label="Project wiki"
			className="h-full overflow-y-auto px-3 pb-8 text-stone-700 dark:text-stone-300"
		>
			<div className="flex items-center justify-between gap-4">
				<h2 className="font-book text-2xl text-stone-950 dark:text-stone-100">
					Project wiki
				</h2>
				<button
					type="button"
					disabled={busy || notes === null}
					onClick={() => void create()}
					className="text-sm hover:underline disabled:opacity-50"
				>
					New note
				</button>
			</div>
			<label className="mt-4 block">
				<span className="sr-only">Find wiki notes</span>
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Find wiki notes"
					className="w-full border-b border-stone-300 bg-transparent py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-stone-700 dark:border-stone-700 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-stone-400"
				/>
			</label>
			{error ? (
				<p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
					{error}
				</p>
			) : null}
			{notes === null ? (
				<p className="mt-6 text-sm">Loading wiki…</p>
			) : !notes.length ? (
				<p className="mt-6 max-w-prose text-sm leading-6">
					Keep characters, places, and research here. Every book attached to
					this project can use these notes.
				</p>
			) : query.trim() ? (
				<ul className="mt-4">
					{matches?.map((note) => (
						<li key={note.id}>
							<button
								type="button"
								className="font-book py-2 text-left hover:underline"
								onClick={() => setOpen(note.id)}
							>
								{note.title || "Untitled"}
							</button>
						</li>
					))}
					{!matches?.length ? (
						<li className="text-sm">No note titles match.</li>
					) : null}
				</ul>
			) : (
				<ul className="mt-4">{entries(null)}</ul>
			)}
		</section>
	);
};
