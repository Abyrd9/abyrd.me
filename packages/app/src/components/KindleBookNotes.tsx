import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { z } from "zod";
import { KindleEditor } from "#/components/KindleEditor";
import { saveKindleLibraryPosition } from "#/components/kindle-library-position";
import { Button } from "#/components/primitives/button";
import {
	type loadKindleLibrary,
	updateKindlePersonal,
} from "#/server/kindle-functions";
import type { personalEditSchema } from "#/server/kindle-personal";

type Library = Awaited<ReturnType<typeof loadKindleLibrary>>;

const NoteEditor = ({
	title,
	label,
	content,
	onSave,
	onDirtyChange,
}: {
	title: string;
	label: string;
	content: string | null;
	onSave: (content: string, previous: string | null) => Promise<void>;
	onDirtyChange?: (dirty: boolean) => void;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<details
			onToggle={(event) => {
				if (event.currentTarget.open) setIsOpen(true);
			}}
		>
			<summary className="cursor-pointer text-sm font-medium">{title}</summary>
			{isOpen && (
				<KindleEditor
					label={label}
					content={content}
					onSave={onSave}
					onDirtyChange={onDirtyChange}
				/>
			)}
		</details>
	);
};

export const KindleBookNotes = ({
	book,
	annotations,
	chapters,
	refresh,
	archive,
	onDirtyChange,
	isArchived = false,
}: {
	book: Library["books"][number];
	annotations: Library["annotations"];
	chapters: Library["chapters"];
	refresh: () => Promise<void>;
	archive: (id: number) => Promise<void>;
	onDirtyChange: (key: string, dirty: boolean) => void;
	isArchived?: boolean;
}) => {
	const [title, setTitle] = useState("");
	const [error, setError] = useState("");
	const [isMoving, setIsMoving] = useState(false);
	const dirtyNotes = useRef(new Set<number>());
	const change = async (data: z.infer<typeof personalEditSchema>) => {
		setError("");
		const blocksEditing =
			data.action === "assignChapter" || data.action === "deleteChapter";
		if (blocksEditing) setIsMoving(true);
		try {
			await updateKindlePersonal({ data });
		} catch {
			if (blocksEditing) setIsMoving(false);
			setError("Could not save your changes. Please try again.");
			throw new Error("Could not save");
		}
		try {
			await refresh();
			return true;
		} catch {
			setError(
				"Your change was saved, but the page could not refresh. Reload to see it.",
			);
			return false;
		} finally {
			if (blocksEditing) setIsMoving(false);
		}
	};
	const highlight = (item: Library["annotations"][number]) => (
		<div className="rounded-xl bg-slate-50 p-4" key={item.id}>
			{item.highlight && (
				<blockquote className="border-l-2 border-amber-400 pl-4 leading-7 text-slate-800">
					{item.highlight}
				</blockquote>
			)}
			{item.note && (
				<p className="mt-4 rounded-lg bg-slate-100 p-3 leading-7 text-slate-800">
					{item.note}
				</p>
			)}
			<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
				<span>
					{item.location
						? `Location ${item.location}`
						: item.page
							? `Page ${item.page}`
							: ""}
				</span>
				<label>
					Chapter{" "}
					<span className="relative inline-flex items-center">
						<select
							className="appearance-none rounded border border-slate-300 bg-white py-2 pr-9 pl-3"
							value={item.chapterId ?? ""}
							onChange={(event) => {
								if (
									dirtyNotes.current.has(item.id) &&
									!confirm(
										"Moving this highlight will discard its unsaved commentary. Continue?",
									)
								) {
									event.target.value = item.chapterId?.toString() ?? "";
									return;
								}
								void change({
									action: "assignChapter",
									id: item.id,
									chapterId: event.target.value
										? Number(event.target.value)
										: null,
								})
									.then((refreshed) => {
										if (refreshed) {
											dirtyNotes.current.delete(item.id);
											onDirtyChange(`${book.asin}:highlight:${item.id}`, false);
										}
									})
									.catch(() => {});
							}}
						>
							<option value="">Unassigned</option>
							{chapters.map((chapter) => (
								<option key={chapter.id} value={chapter.id}>
									{chapter.title}
								</option>
							))}
						</select>
						<svg
							aria-hidden="true"
							className="pointer-events-none absolute right-3"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</span>
				</label>
				<Button
					onClick={() => {
						if (
							!dirtyNotes.current.has(item.id) ||
							confirm("This will discard unsaved commentary. Continue?")
						) {
							setIsMoving(true);
							void archive(item.id)
								.then(() => {
									dirtyNotes.current.delete(item.id);
									onDirtyChange(`${book.asin}:highlight:${item.id}`, false);
								})
								.catch(() =>
									setError("Could not update the highlight. Please try again."),
								)
								.finally(() => setIsMoving(false));
						}
					}}
				>
					{isArchived ? "Restore note" : "Archive note"}
				</Button>
			</div>
			<div className="mt-3">
				<NoteEditor
					title="Your commentary"
					label="Your commentary"
					content={item.commentary}
					onDirtyChange={(dirty) => {
						if (dirty) dirtyNotes.current.add(item.id);
						else dirtyNotes.current.delete(item.id);
						onDirtyChange(`${book.asin}:highlight:${item.id}`, dirty);
					}}
					onSave={async (content, previous) => {
						await change({
							action: "saveCommentary",
							id: item.id,
							content,
							previous,
						});
					}}
				/>
			</div>
		</div>
	);
	return (
		<div className="mt-4 grid gap-4" inert={isMoving || undefined}>
			{error && (
				<p role="alert" className="text-red-700">
					{error}
				</p>
			)}
			<Link
				className="w-fit text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
				to="/kindle/synopsis/$asin/$target"
				params={{ asin: book.asin, target: "book" }}
				search={{ from: isArchived ? "archived" : "library" }}
				onClick={() => saveKindleLibraryPosition(book.asin)}
			>
				{book.synopsis ? "Edit book synopsis" : "Write book synopsis"} →
			</Link>
			<div className="border-t border-slate-200 pt-4">
				<h3 className="font-medium">Chapters</h3>
				<form
					className="mt-2 flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (title.trim())
							void change({ action: "createChapter", asin: book.asin, title })
								.then(() => setTitle(""))
								.catch(() => {});
					}}
				>
					<input
						aria-label="New chapter title"
						className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Chapter title"
					/>
					<Button type="submit">Add chapter</Button>
				</form>
			</div>
			{chapters.map((chapter, index) => (
				<details
					key={chapter.id}
					data-kindle-panel={`chapter:${book.asin}:${chapter.id}`}
					className="rounded-lg border border-slate-200 p-4"
				>
					<summary className="cursor-pointer font-medium">
						{chapter.title} (
						{annotations.filter((item) => item.chapterId === chapter.id).length}
						)
					</summary>
					<div className="mt-3 flex flex-wrap gap-2">
						<Button
							disabled={index === 0}
							onClick={() =>
								void change({
									action: "moveChapter",
									id: chapter.id,
									direction: "up",
								}).catch(() => {})
							}
						>
							Move up
						</Button>
						<Button
							disabled={index === chapters.length - 1}
							onClick={() =>
								void change({
									action: "moveChapter",
									id: chapter.id,
									direction: "down",
								}).catch(() => {})
							}
						>
							Move down
						</Button>
						<Button
							onClick={() => {
								const next = prompt("Chapter title", chapter.title);
								if (next?.trim())
									void change({
										action: "renameChapter",
										id: chapter.id,
										title: next,
									}).catch(() => {});
							}}
						>
							Rename
						</Button>
						<Button
							onClick={() => {
								if (
									confirm(
										"Delete this chapter and its synopsis? Its highlights will become unassigned, and unsaved edits in this chapter will be lost.",
									)
								)
									void change({
										action: "deleteChapter",
										id: chapter.id,
										previous: chapter.synopsis,
									})
										.then((refreshed) => {
											if (!refreshed) return;
											onDirtyChange(
												`${book.asin}:chapter:${chapter.id}`,
												false,
											);
											for (const item of annotations.filter(
												(entry) => entry.chapterId === chapter.id,
											)) {
												dirtyNotes.current.delete(item.id);
												onDirtyChange(
													`${book.asin}:highlight:${item.id}`,
													false,
												);
											}
										})
										.catch(() => {});
							}}
						>
							Delete chapter
						</Button>
					</div>
					<Link
						className="mt-4 inline-block text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
						to="/kindle/synopsis/$asin/$target"
						params={{ asin: book.asin, target: String(chapter.id) }}
						search={{ from: isArchived ? "archived" : "library" }}
						onClick={() => saveKindleLibraryPosition(book.asin)}
					>
						{chapter.synopsis
							? "Edit chapter synopsis"
							: "Write chapter synopsis"}{" "}
						→
					</Link>
					<div className="mt-4 grid gap-4">
						{annotations
							.filter((item) => item.chapterId === chapter.id)
							.map(highlight)}
					</div>
				</details>
			))}
			<h3 className="font-medium">Unassigned highlights</h3>
			{annotations.filter((item) => item.chapterId === null).map(highlight)}
		</div>
	);
};
