import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { type ReactNode, useState } from "react";
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

/**
 * The writing's notes set like a book's contents page: the whole book first,
 * then each chapter, every level showing, with dotted leaders to a count or
 * date. Sits beside the paper; opening an entry replaces it with the note.
 */
export const NotesContents = ({
	chapters,
	notes,
	currentChapterId,
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
	const [renaming, setRenaming] = useState<number | null>(null);
	const [moving, setMoving] = useState<BinderNote | null>(null);
	const groups = groupNotes(notes);

	const renderEntries = (place: Placement, depth: number): ReactNode =>
		childrenOf(groups, place).map((note, index, siblings) => {
			const children = childrenOf(groups, {
				chapterId: note.chapterId,
				parentId: note.id,
			});
			const inside = subtreeIds(notes, note.id).size - 1;
			return (
				<li key={note.id}>
					<Entry
						actions={
							<>
								<AddButton
									label={`Add a note inside ${note.title || "Untitled"}`}
									onClick={() =>
										onCreate({ chapterId: note.chapterId, parentId: note.id })
									}
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
						depth={depth}
						inside={inside}
					>
						{renaming === note.id ? (
							<input
								aria-label="Note title"
								className="min-w-0 flex-1 rounded bg-white px-1 text-stone-900 outline-none ring-1 ring-stone-300"
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
								className="min-w-0 truncate text-left hover:underline hover:decoration-stone-300 hover:underline-offset-4"
								onClick={() => onOpenNote(note.id)}
								onDoubleClick={() => setRenaming(note.id)}
								type="button"
							>
								{note.title || <span className="text-stone-400">Untitled</span>}
							</button>
						)}
					</Entry>
					{children.length ? (
						<ul>
							{renderEntries(
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
		return chapter ? chapterLabel(chapter) : "The whole book";
	};
	const bookNotes = childrenOf(groups, { chapterId: null, parentId: null });

	return (
		<aside
			aria-label="Notes"
			className="flex h-full flex-col bg-stone-100 font-sans text-stone-700 dark:bg-[#0a0a0a] dark:text-stone-300"
		>
			<div className="flex items-baseline justify-between gap-3 px-6">
				<h2 className="font-book text-[22px] text-stone-900 dark:text-stone-100">
					Notes
				</h2>
				<span className="ml-auto text-xs text-stone-400 tabular-nums">
					{notes.length} {notes.length === 1 ? "note" : "notes"}
				</span>
				<button
					aria-label="Hide notes (⌘\)"
					className="inline-flex size-7 items-center justify-center self-center rounded-md text-stone-400 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800"
					onClick={onClose}
					title="Hide notes (⌘\)"
					type="button"
				>
					<svg
						aria-hidden="true"
						fill="none"
						height="15"
						stroke="currentColor"
						strokeLinecap="round"
						strokeWidth="2"
						viewBox="0 0 24 24"
						width="15"
					>
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
			<label className="mx-6 mt-3 flex items-center gap-2 border-b border-stone-300 pb-1 text-sm text-stone-500 focus-within:border-stone-600 dark:border-stone-700">
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

			<nav
				aria-label="Contents"
				className="min-h-0 flex-1 overflow-y-auto px-6 pb-8"
			>
				{search ? (
					matches.length ? (
						<ul className="mt-4">
							{matches.map((note) => (
								<li key={note.id}>
									<button
										className="font-book w-full py-1.5 text-left"
										onClick={() => onOpenNote(note.id)}
										type="button"
									>
										<span className="block truncate text-[15px] text-stone-900 dark:text-stone-100">
											{note.title || "Untitled"}
										</span>
										<span className="block truncate font-sans text-xs text-stone-500">
											{placeLabel(note)}
										</span>
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-4 text-sm text-stone-500">No note titles match.</p>
					)
				) : (
					<>
						<Section
							addLabel="Add a note for the whole book"
							label="The whole book"
							onAdd={() => onCreate({ chapterId: null, parentId: null })}
						/>
						{bookNotes.length ? (
							<ul>{renderEntries({ chapterId: null, parentId: null }, 0)}</ul>
						) : (
							<p className="font-book text-sm text-stone-400 italic">
								Characters, places, themes: anything for the whole book.
							</p>
						)}
						{chapters.map((chapter) => (
							<div key={chapter.id}>
								<Section
									addLabel={`Add a note to ${chapterLabel(chapter)}`}
									current={chapter.id === currentChapterId}
									label={chapterLabel(chapter)}
									onAdd={() =>
										onCreate({ chapterId: chapter.id, parentId: null })
									}
									onOpen={() => onOpenChapter(chapter.id)}
								/>
								<ul>
									{renderEntries({ chapterId: chapter.id, parentId: null }, 0)}
								</ul>
							</div>
						))}
					</>
				)}
			</nav>
			<p className="px-6 py-2 text-[11px] text-stone-400">
				⌘\ hides notes · double-click an entry to rename
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

/**
 * One line of the contents: the title, then a dotted leader to the number of
 * notes inside it. A note with none inside shows just its title.
 */
const Entry = ({
	depth,
	inside,
	actions,
	children,
}: {
	depth: number;
	/** How many notes sit beneath this one, at any depth. */
	inside: number;
	actions: ReactNode;
	children: ReactNode;
}) => (
	<div
		className={`group font-book flex items-baseline gap-2 py-[3px] ${depth === 0 ? "text-[15.5px] text-stone-900 dark:text-stone-100" : depth === 1 ? "text-[14.5px] text-stone-800 dark:text-stone-200" : "text-[14px] text-stone-600 dark:text-stone-400"}`}
		style={{ paddingLeft: depth * 20 }}
	>
		{children}
		<span
			aria-hidden="true"
			className={`min-w-4 flex-1 ${inside ? "translate-y-[-4px] border-b-[1.5px] border-dotted border-stone-300 dark:border-stone-700" : ""}`}
		/>
		<span className="relative shrink-0">
			{inside ? (
				<span
					className="font-mono text-[11px] text-stone-400 tabular-nums group-focus-within:invisible group-hover:invisible max-sm:hidden"
					title={`${inside} ${inside === 1 ? "note" : "notes"} inside`}
				>
					{inside}
				</span>
			) : null}
			<span className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-sm:static max-sm:translate-y-0 max-sm:opacity-100">
				{actions}
			</span>
		</span>
	</div>
);

const Section = ({
	label,
	addLabel,
	onAdd,
	onOpen,
	current = false,
}: {
	label: string;
	addLabel: string;
	onAdd: () => void;
	/** Chapter sections open their chapter on the page. */
	onOpen?: () => void;
	/** Marks the chapter on the page. */
	current?: boolean;
}) => (
	<div className="group mt-6 mb-1.5 flex items-center gap-2">
		{onOpen ? (
			<button
				aria-current={current ? "page" : undefined}
				className={`min-w-0 truncate text-[11px] font-medium tracking-[0.08em] uppercase hover:text-stone-900 dark:hover:text-stone-100 ${current ? "text-stone-900 dark:text-stone-100" : "text-stone-400"}`}
				onClick={onOpen}
				type="button"
			>
				{current ? (
					<span aria-hidden="true" className="mr-1">
						▸
					</span>
				) : null}
				{label}
			</button>
		) : (
			<h3 className="text-[11px] font-medium tracking-[0.08em] text-stone-400 uppercase">
				{label}
			</h3>
		)}
		<span className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
			<AddButton label={addLabel} onClick={onAdd} />
		</span>
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
