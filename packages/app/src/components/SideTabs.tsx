export type SideTab = "notes" | "dictionary" | "guides";

export const sideTabs: Array<{ id: SideTab; label: string }> = [
	{ id: "notes", label: "Notes" },
	{ id: "dictionary", label: "Dictionary" },
	{ id: "guides", label: "Guides" },
];

export const toSideTab = (value: string | null): SideTab =>
	sideTabs.find((tab) => tab.id === value)?.id ?? "notes";

/** Height of the tab row, which papers below it subtract from their own. */
export const SIDE_TABS_HEIGHT = 44;

/** The pills along the top of the side column, and a button to hide it. */
export const SideTabs = ({
	tab,
	onTab,
	onHide,
}: {
	tab: SideTab;
	onTab: (tab: SideTab) => void;
	onHide: () => void;
}) => (
	<div
		className="flex shrink-0 items-start gap-1.5 max-md:px-3 max-md:pt-2"
		style={{ height: SIDE_TABS_HEIGHT }}
	>
		<div aria-label="Side panel" className="flex gap-1.5" role="tablist">
			{sideTabs.map(({ id, label }) => (
				<button
					aria-selected={tab === id}
					className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
						tab === id
							? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
							: "border-stone-300 bg-white/60 text-stone-600 hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:bg-transparent dark:text-stone-300 dark:hover:text-stone-100"
					}`}
					key={id}
					onClick={() => onTab(id)}
					role="tab"
					type="button"
				>
					{label}
				</button>
			))}
		</div>
		<button
			aria-label="Hide side panel (⌘\)"
			className="grid size-[26px] place-items-center rounded-full border border-stone-300 bg-white/60 text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:bg-transparent dark:hover:text-stone-100"
			onClick={onHide}
			title="Hide (⌘\)"
			type="button"
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
				<path d="m9 18 6-6-6-6" />
			</svg>
		</button>
	</div>
);
