import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { type ReactNode, useEffect, useState } from "react";
import { chapterLabel } from "#/components/NotePane";
import type { listWritingNotes } from "#/server/writing-notes-functions";

export type BinderNote = Awaited<ReturnType<typeof listWritingNotes>>[number];
type Chapter = { id: number; title: string; position: number };
type Placement = { chapterId: number | null; parentId: number | null };

/** Notes grouped by where they hang: "chapterId:parentId", in sibling order. */
const groupNotes = (notes: BinderNote[]) => {
	const groups = new Map<string, BinderNote[]>();
	for (const note of notes) {
		const key = `${note.chapterId}:${note.parentId}`;
		groups.set(key, [...(groups.get(key) ?? []), note]);
	}
	for (const group of groups.values())
		group.sort((a, b) => a.position - b.position || a.id - b.id);
	return groups;
};

const childrenOf = (groups: Map<string, BinderNote[]>, place: Placement) =>
	groups.get(`${place.chapterId}:${place.parentId}`) ?? [];

/** The note and everything beneath it. */
export const subtreeIds = (notes: BinderNote[], id: number) => {
	const ids = new Set([id]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const note of notes)
			if (
				note.parentId !== null &&
				ids.has(note.parentId) &&
				!ids.has(note.id)
			) {
				ids.add(note.id);
				grew = true;
			}
	}
	return ids;
};

const ancestorIds = (notes: BinderNote[], id: number | null) => {
	const byId = new Map(notes.map((note) => [note.id, note]));
	const ids: number[] = [];
	let current = id === null ? undefined : byId.get(id)?.parentId;
	while (current !== null && current !== undefined) {
		ids.push(current);
		current = byId.get(current)?.parentId;
	}
	return ids;
};

/**
 * The writing's notes as a tree: notes for the whole book first, then each
 * chapter with its own. Slides in from the left and stays out of the way.
 */
export const WritingBinder = ({
	chapters,
	notes,
	currentChapterId,
	openNoteId,
	onClose,
	onOpenChapter,
	onOpenNote,
	onCreate,
	onRename,
	onReorder,
	onMove,
	onDelete,
}: {
	chapters: Chapter[];
	notes: BinderNote[];
	currentChapterId: number;
	openNoteId: number | null;
	onClose: () => void;
	onOpenChapter: (id: number) => void;
	onOpenNote: (id: number) => void;
	onCreate: (place: Placement) => void;
	onRename: (id: number, title: string) => void;
	onReorder: (id: number, direction: "earlier" | "later") => void;
	onMove: (id: number, to: Placement) => void;
	onDelete: (note: BinderNote) => void;
}) => {
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState(() => new Set<string>());
	const [renaming, setRenaming] = useState<number | null>(null);
	const [moving, setMoving] = useState<BinderNote | null>(null);
	const groups = groupNotes(notes);

	// Keeps the current chapter and the open note's ancestors unfolded.
	useEffect(() => {
		setExpanded((current) => {
			const next = new Set(current);
			next.add(`chapter:${currentChapterId}`);
			for (const id of ancestorIds(notes, openNoteId)) next.add(`note:${id}`);
			const open = notes.find((note) => note.id === openNoteId);
			if (open?.chapterId) next.add(`chapter:${open.chapterId}`);
			return next.size === current.size ? current : next;
		});
	}, [currentChapterId, openNoteId, notes]);

	const toggle = (key: string) =>
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const renderNotes = (place: Placement, depth: number): ReactNode =>
		childrenOf(groups, place).map((note, index, siblings) => {
			const children = childrenOf(groups, {
				chapterId: note.chapterId,
				parentId: note.id,
			});
			const key = `note:${note.id}`;
			const isOpen = expanded.has(key);
			return (
				<li key={note.id}>
					<Row
						active={note.id === openNoteId}
						depth={depth}
						expandable={children.length > 0}
						expanded={isOpen}
						onToggle={() => toggle(key)}
						actions={
							<>
								<AddButton
									label={`Add a note inside ${note.title || "Untitled"}`}
									onClick={() => {
										setExpanded((current) => new Set(current).add(key));
										onCreate({ chapterId: note.chapterId, parentId: note.id });
									}}
								/>
								<NoteMenu
									canMoveEarlier={index > 0}
									canMoveLater={index < siblings.length - 1}
									note={note}
									onDelete={() => onDelete(note)}
									onMoveTo={() => setMoving(note)}
									onRename={() => setRenaming(note.id)}
									onReorder={(direction) => onReorder(note.id, direction)}
								/>
							</>
						}
					>
						{renaming === note.id ? (
							<input
								aria-label="Note title"
								className="min-w-0 flex-1 rounded bg-white px-1 py-0.5 text-stone-900 outline-none ring-1 ring-stone-300"
								defaultValue={note.title}
								onBlur={(event) => {
									setRenaming(null);
									const title = event.target.value.trim();
									if (title !== note.title) onRename(note.id, title);
								}}
								onKeyDown={(event) => {
									if (event.key === "Enter") event.currentTarget.blur();
									if (event.key === "Escape") setRenaming(null);
								}}
								ref={(element) => element?.focus()}
							/>
						) : (
							<button
								className="min-w-0 flex-1 truncate text-left"
								onClick={() => onOpenNote(note.id)}
								onDoubleClick={() => setRenaming(note.id)}
								type="button"
							>
								{note.title || <span className="text-stone-400">Untitled</span>}
							</button>
						)}
					</Row>
					{isOpen && children.length ? (
						<ul>
							{renderNotes(
								{ chapterId: note.chapterId, parentId: note.id },
								depth + 1,
							)}
						</ul>
					) : null}
				</li>
			);
		});

	const search = query.trim().toLowerCase();
	const matches = search
		? notes.filter((note) => note.title.toLowerCase().includes(search))
		: [];
	const placeLabel = (note: BinderNote) => {
		const chapter = chapters.find((item) => item.id === note.chapterId);
		return chapter ? chapterLabel(chapter) : "Book notes";
	};

	return (
		<aside
			aria-label="Notes"
			className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col border-r border-stone-200 bg-stone-50 font-sans text-sm text-stone-700 shadow-2xl dark:border-stone-800 dark:bg-[#111] dark:text-stone-300"
		>
			<div className="flex items-center justify-between px-4 pt-4">
				<h2 className="font-book text-lg text-stone-900 dark:text-stone-100">
					Notes
				</h2>
				<button
					aria-label="Close notes (⌘\)"
					className="inline-flex size-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800"
					onClick={onClose}
					title="Close (⌘\)"
					type="button"
				>
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
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
			<label className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-stone-500 focus-within:border-stone-400 dark:border-stone-800">
				<svg
					aria-hidden="true"
					fill="none"
					height="14"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
					viewBox="0 0 24 24"
					width="14"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.5-3.5" />
				</svg>
				<span className="sr-only">Find notes</span>
				<input
					className="min-w-0 flex-1 bg-transparent text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Find notes"
					value={query}
				/>
			</label>

			<nav className="mt-3 flex-1 overflow-y-auto px-2 pb-6">
				{search ? (
					matches.length ? (
						<ul>
							{matches.map((note) => (
								<li key={note.id}>
									<button
										className={`w-full rounded-md px-2 py-1.5 text-left hover:bg-stone-200/70 dark:hover:bg-stone-800 ${note.id === openNoteId ? "bg-stone-200/70 dark:bg-stone-800" : ""}`}
										onClick={() => onOpenNote(note.id)}
										type="button"
									>
										<span className="block truncate text-stone-900 dark:text-stone-100">
											{note.title || "Untitled"}
										</span>
										<span className="block truncate text-xs text-stone-500">
											{placeLabel(note)}
										</span>
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="px-2 py-3 text-stone-500">No note titles match.</p>
					)
				) : (
					<>
						<SectionHeading
							label="Book notes"
							onAdd={() => onCreate({ chapterId: null, parentId: null })}
							addLabel="Add a note for the whole book"
						/>
						<ul>{renderNotes({ chapterId: null, parentId: null }, 0)}</ul>
						{childrenOf(groups, { chapterId: null, parentId: null }).length ===
						0 ? (
							<p className="px-2 pb-2 text-xs text-stone-400">
								Characters, places, themes: anything for the whole book.
							</p>
						) : null}

						<SectionHeading label="Chapters" />
						<ul>
							{chapters.map((chapter) => {
								const key = `chapter:${chapter.id}`;
								const chapterNotes = childrenOf(groups, {
									chapterId: chapter.id,
									parentId: null,
								});
								return (
									<li key={chapter.id}>
										<Row
											active={
												chapter.id === currentChapterId && openNoteId === null
											}
											current={chapter.id === currentChapterId}
											depth={0}
											expandable={chapterNotes.length > 0}
											expanded={expanded.has(key)}
											onToggle={() => toggle(key)}
											actions={
												<AddButton
													label={`Add a note to ${chapterLabel(chapter)}`}
													onClick={() => {
														setExpanded((current) => new Set(current).add(key));
														onCreate({ chapterId: chapter.id, parentId: null });
													}}
												/>
											}
										>
											<button
												className="min-w-0 flex-1 truncate text-left font-medium"
												onClick={() => onOpenChapter(chapter.id)}
												type="button"
											>
												{chapterLabel(chapter)}
											</button>
										</Row>
										{expanded.has(key) && chapterNotes.length ? (
											<ul>
												{renderNotes(
													{ chapterId: chapter.id, parentId: null },
													1,
												)}
											</ul>
										) : null}
									</li>
								);
							})}
						</ul>
					</>
				)}
			</nav>
			<p className="border-t border-stone-200 px-4 py-2 text-xs text-stone-400 dark:border-stone-800">
				⌘\ opens and closes notes · double-click to rename
			</p>

			<MoveDialog
				chapters={chapters}
				groups={groups}
				note={moving}
				notes={notes}
				onClose={() => setMoving(null)}
				onMove={(to) => {
					if (moving) onMove(moving.id, to);
					setMoving(null);
				}}
			/>
		</aside>
	);
};

const Row = ({
	active,
	current = false,
	depth,
	expandable,
	expanded,
	onToggle,
	actions,
	children,
}: {
	active: boolean;
	/** The chapter on the page, marked even while a note is open beside it. */
	current?: boolean;
	depth: number;
	expandable: boolean;
	expanded: boolean;
	onToggle: () => void;
	actions: ReactNode;
	children: ReactNode;
}) => (
	<div
		className={`group flex items-center gap-1 rounded-md py-0.5 pr-1 hover:bg-stone-200/70 dark:hover:bg-stone-800 ${active ? "bg-stone-200/70 text-stone-950 dark:bg-stone-800 dark:text-white" : current ? "text-stone-950 dark:text-white" : ""}`}
		style={{ paddingLeft: depth * 14 + 2 }}
	>
		<button
			aria-expanded={expandable ? expanded : undefined}
			aria-label={expanded ? "Collapse" : "Expand"}
			className={`inline-flex size-5 shrink-0 items-center justify-center rounded text-stone-400 hover:text-stone-800 ${expandable ? "" : "invisible"}`}
			onClick={onToggle}
			tabIndex={expandable ? 0 : -1}
			type="button"
		>
			<svg
				aria-hidden="true"
				className={`transition-transform ${expanded ? "rotate-90" : ""}`}
				fill="none"
				height="12"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2.5"
				viewBox="0 0 24 24"
				width="12"
			>
				<path d="m9 18 6-6-6-6" />
			</svg>
		</button>
		{children}
		<span className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
			{actions}
		</span>
	</div>
);

const SectionHeading = ({
	label,
	onAdd,
	addLabel,
}: {
	label: string;
	onAdd?: () => void;
	addLabel?: string;
}) => (
	<div className="group mt-3 flex items-center justify-between px-2 pb-1">
		<h3 className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">
			{label}
		</h3>
		{onAdd && addLabel ? <AddButton label={addLabel} onClick={onAdd} /> : null}
	</div>
);

const AddButton = ({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) => (
	<button
		aria-label={label}
		className="inline-flex size-6 items-center justify-center rounded text-stone-400 hover:bg-stone-300/60 hover:text-stone-900 dark:hover:bg-stone-700"
		onClick={onClick}
		title={label}
		type="button"
	>
		<svg
			aria-hidden="true"
			fill="none"
			height="14"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			width="14"
		>
			<path d="M12 5v14M5 12h14" />
		</svg>
	</button>
);

const menuItem =
	"cursor-pointer rounded-md px-3 py-1.5 outline-none data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[highlighted]:bg-stone-100 dark:data-[highlighted]:bg-stone-800";

const NoteMenu = ({
	note,
	canMoveEarlier,
	canMoveLater,
	onRename,
	onReorder,
	onMoveTo,
	onDelete,
}: {
	note: BinderNote;
	canMoveEarlier: boolean;
	canMoveLater: boolean;
	onRename: () => void;
	onReorder: (direction: "earlier" | "later") => void;
	onMoveTo: () => void;
	onDelete: () => void;
}) => (
	<Menu.Root>
		<Menu.Trigger
			aria-label={`Options for ${note.title || "Untitled"}`}
			className="inline-flex size-6 items-center justify-center rounded text-stone-400 hover:bg-stone-300/60 hover:text-stone-900 dark:hover:bg-stone-700"
		>
			<svg
				aria-hidden="true"
				fill="currentColor"
				height="14"
				viewBox="0 0 24 24"
				width="14"
			>
				<circle cx="5" cy="12" r="1.8" />
				<circle cx="12" cy="12" r="1.8" />
				<circle cx="19" cy="12" r="1.8" />
			</svg>
		</Menu.Trigger>
		<Menu.Portal>
			<Menu.Positioner align="start" className="z-[60]" sideOffset={4}>
				<Menu.Popup className="min-w-40 rounded-lg border border-stone-200 bg-white p-1 font-sans text-sm text-stone-700 shadow-lg outline-none dark:border-stone-700 dark:text-stone-200">
					<Menu.Item className={menuItem} onClick={onRename}>
						Rename
					</Menu.Item>
					<Menu.Item
						className={menuItem}
						disabled={!canMoveEarlier}
						onClick={() => onReorder("earlier")}
					>
						Move up
					</Menu.Item>
					<Menu.Item
						className={menuItem}
						disabled={!canMoveLater}
						onClick={() => onReorder("later")}
					>
						Move down
					</Menu.Item>
					<Menu.Item className={menuItem} onClick={onMoveTo}>
						Move to…
					</Menu.Item>
					<Menu.Item
						className={`${menuItem} text-red-700 data-[highlighted]:bg-red-50`}
						onClick={onDelete}
					>
						Delete…
					</Menu.Item>
				</Menu.Popup>
			</Menu.Positioner>
		</Menu.Portal>
	</Menu.Root>
);

/** Every place a note could go: the top of each section, or under any note outside its own subtree. */
const MoveDialog = ({
	note,
	notes,
	groups,
	chapters,
	onMove,
	onClose,
}: {
	note: BinderNote | null;
	notes: BinderNote[];
	groups: Map<string, BinderNote[]>;
	chapters: Chapter[];
	onMove: (to: Placement) => void;
	onClose: () => void;
}) => {
	const excluded = note ? subtreeIds(notes, note.id) : new Set<number>();
	const isCurrent = (place: Placement) =>
		note?.chapterId === place.chapterId && note?.parentId === place.parentId;

	const destination = (
		place: Placement,
		label: ReactNode,
		depth: number,
		key: string,
	) => (
		<li key={key}>
			<button
				className="w-full truncate rounded-md px-2 py-1.5 text-left hover:bg-stone-100 disabled:cursor-default disabled:text-stone-400 disabled:hover:bg-transparent dark:hover:bg-stone-800"
				disabled={isCurrent(place)}
				onClick={() => onMove(place)}
				style={{ paddingLeft: depth * 16 + 8 }}
				type="button"
			>
				{label}
				{isCurrent(place) ? <span className="text-xs"> · here now</span> : null}
			</button>
		</li>
	);

	const notesUnder = (place: Placement, depth: number): ReactNode[] =>
		childrenOf(groups, place)
			.filter((candidate) => !excluded.has(candidate.id))
			.flatMap((candidate) => [
				destination(
					{ chapterId: candidate.chapterId, parentId: candidate.id },
					candidate.title || "Untitled",
					depth,
					`note:${candidate.id}`,
				),
				...notesUnder(
					{ chapterId: candidate.chapterId, parentId: candidate.id },
					depth + 1,
				),
			]);

	return (
		<Dialog.Root
			onOpenChange={(open) => !open && onClose()}
			open={note !== null}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-[60] bg-stone-950/30" />
				<Dialog.Popup className="fixed top-[12vh] left-1/2 z-[60] flex max-h-[70vh] w-[min(92vw,26rem)] -translate-x-1/2 flex-col rounded-2xl border border-stone-200 bg-white font-sans text-sm text-stone-700 shadow-2xl outline-none dark:border-stone-700 dark:text-stone-200">
					<Dialog.Title className="px-4 pt-4 font-medium text-stone-900 dark:text-stone-100">
						Move “{note?.title || "Untitled"}”
					</Dialog.Title>
					<Dialog.Description className="px-4 pt-1 text-xs text-stone-500">
						Notes beneath it move too.
					</Dialog.Description>
					<ul className="mt-3 overflow-y-auto px-2 pb-3">
						{destination(
							{ chapterId: null, parentId: null },
							<strong className="font-medium">Book notes</strong>,
							0,
							"book",
						)}
						{notesUnder({ chapterId: null, parentId: null }, 1)}
						{chapters.flatMap((chapter) => [
							destination(
								{ chapterId: chapter.id, parentId: null },
								<strong className="font-medium">
									{chapterLabel(chapter)}
								</strong>,
								0,
								`chapter:${chapter.id}`,
							),
							...notesUnder({ chapterId: chapter.id, parentId: null }, 1),
						])}
					</ul>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
