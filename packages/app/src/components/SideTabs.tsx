export type SideTab = "notes" | "dictionary" | "guides";

export const sideTabs: Array<{ id: SideTab; label: string }> = [
	{ id: "notes", label: "Notes" },
	{ id: "dictionary", label: "Dictionary" },
	{ id: "guides", label: "Guides" },
];

export const toSideTab = (value: string | null): SideTab =>
	sideTabs.find((tab) => tab.id === value)?.id ?? "notes";

/**
 * The pills along the top of the side column, and a button that closes it.
 * On wider screens the row sits in the gap above the papers, so each tab's
 * card starts level with the chapter's page.
 */
export const SideTabs = ({
	tab,
	onTab,
	onClose,
}: {
	tab: SideTab;
	onTab: (tab: SideTab) => void;
	onClose: () => void;
}) => (
	<div className="flex h-10 shrink-0 items-center justify-between gap-1.5 max-md:px-3 md:-mt-10">
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
			aria-label="Close side panel (⌘\)"
			className="grid size-7 place-items-center rounded-full text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
			onClick={onClose}
			title="Close (⌘\)"
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
);
