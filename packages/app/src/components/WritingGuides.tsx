import { useEffect, useState } from "react";
import { type Guide, guides } from "#/components/writing-guides";

const GUIDE_KEY = "abyrd.writing-guide";

// Colors for the hero's journey movements, in group order.
const groupTones = [
	"fill-amber-100 stroke-amber-400 dark:fill-amber-950 dark:stroke-amber-700",
	"fill-rose-100 stroke-rose-400 dark:fill-rose-950 dark:stroke-rose-700",
	"fill-sky-100 stroke-sky-400 dark:fill-sky-950 dark:stroke-sky-700",
];
const groupDots = ["bg-amber-300", "bg-rose-300", "bg-sky-300"];

/**
 * Reference guides for shaping a story or essay: pick one, see its shape,
 * and click a step to read what it asks of you.
 */
export const WritingGuides = () => {
	const [guideId, setGuideId] = useState(guides[0].id);
	const [selected, setSelected] = useState(0);

	useEffect(() => {
		const saved = localStorage.getItem(GUIDE_KEY);
		if (guides.some((guide) => guide.id === saved) && saved) setGuideId(saved);
	}, []);

	const guide = guides.find((item) => item.id === guideId) ?? guides[0];
	const step = guide.steps[selected] ?? guide.steps[0];
	const choose = (id: string) => {
		localStorage.setItem(GUIDE_KEY, id);
		setGuideId(id);
		setSelected(0);
	};

	return (
		<section
			aria-label="Writing guides"
			className="flex h-full items-start max-sm:items-stretch"
		>
			<div className="max-h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-white px-6 pt-6 pb-10 text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:px-9 dark:bg-stone-900 dark:text-stone-100">
				<nav
					aria-label="Guides"
					className="mb-6 flex flex-wrap gap-x-4 gap-y-1 font-sans text-sm"
				>
					{guides.map((item) => (
						<button
							aria-current={item.id === guide.id ? "true" : undefined}
							className={`border-b-2 pb-0.5 transition-colors ${
								item.id === guide.id
									? "border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100"
									: "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
							}`}
							key={item.id}
							onClick={() => choose(item.id)}
							type="button"
						>
							{item.name}
						</button>
					))}
				</nav>

				<h2 className="font-book text-3xl">{guide.name}</h2>
				<p className="font-book mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
					{guide.summary}
				</p>

				<div className="my-6">
					{guide.shape === "circle" ? (
						<CircleDiagram
							guide={guide}
							onSelect={setSelected}
							selected={selected}
						/>
					) : guide.shape === "timeline" ? (
						<TimelineDiagram
							guide={guide}
							onSelect={setSelected}
							selected={selected}
						/>
					) : (
						<FlowDiagram
							guide={guide}
							onSelect={setSelected}
							selected={selected}
						/>
					)}
				</div>

				<StepDetail
					count={guide.steps.length}
					index={selected}
					onSelect={setSelected}
					step={step}
				/>

				<p className="mt-10 font-sans text-[11px] leading-normal text-stone-400">
					{guide.credit}
				</p>
			</div>
		</section>
	);
};

type DiagramProps = {
	guide: Guide;
	selected: number;
	onSelect: (index: number) => void;
};

/** Steps around a circle, starting at the top and running clockwise. */
const CircleDiagram = ({ guide, selected, onSelect }: DiagramProps) => {
	const size = 360;
	const center = size / 2;
	const radius = 112;
	const count = guide.steps.length;
	const small = count > 8;
	const node = small ? 13 : 16;
	const margin = 110;

	return (
		<div>
			<svg
				aria-label={`${guide.name} diagram`}
				className="mx-auto block w-full max-w-[36rem] font-sans"
				role="img"
				// Extra room left and right for long step names.
				viewBox={`${-margin} 0 ${size + 2 * margin} ${size}`}
			>
				{guide.halves ? (
					<>
						<line
							className="stroke-stone-300 dark:stroke-stone-600"
							strokeDasharray="4 4"
							x1={center - radius - 26}
							x2={center + radius + 26}
							y1={center}
							y2={center}
						/>
						<text
							className="fill-stone-400 text-[10px] tracking-[0.12em] uppercase"
							textAnchor="middle"
							x={center}
							y={center - 12}
						>
							{guide.halves[0]}
						</text>
						<text
							className="fill-stone-400 text-[10px] tracking-[0.12em] uppercase"
							textAnchor="middle"
							x={center}
							y={center + 20}
						>
							{guide.halves[1]}
						</text>
					</>
				) : null}
				<circle
					className="fill-none stroke-stone-300 dark:stroke-stone-600"
					cx={center}
					cy={center}
					r={radius}
					strokeWidth="1.5"
				/>
				{guide.steps.map((item, index) => {
					const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;
					const x = center + radius * Math.cos(angle);
					const y = center + radius * Math.sin(angle);
					const labelRadius = radius + node + 10;
					const lx = center + labelRadius * Math.cos(angle);
					const ly = center + labelRadius * Math.sin(angle);
					// Labels near the top stack upward, so they don't cover the node.
					const lift =
						Math.sin(angle) < -0.7 ? -10 : Math.sin(angle) > 0.7 ? 6 : 0;
					const anchor =
						Math.abs(Math.cos(angle)) < 0.2
							? "middle"
							: Math.cos(angle) > 0
								? "start"
								: "end";
					const group = item.group
						? (guide.groups?.indexOf(item.group) ?? -1)
						: -1;
					const active = index === selected;
					return (
						// biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a button element.
						<g
							aria-label={`${index + 1}. ${item.name}`}
							className="cursor-pointer focus:outline-none"
							key={item.name}
							onClick={() => onSelect(index)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onSelect(index);
								}
							}}
							role="button"
							tabIndex={0}
						>
							<circle
								className={
									active
										? "fill-stone-900 stroke-stone-900 dark:fill-stone-100 dark:stroke-stone-100"
										: group >= 0
											? groupTones[group]
											: "fill-white stroke-stone-400 dark:fill-stone-900 dark:stroke-stone-500"
								}
								cx={x}
								cy={y}
								r={node}
								strokeWidth="1.5"
							/>
							<text
								className={`text-[11px] font-semibold ${active ? "fill-white dark:fill-stone-900" : "fill-stone-700 dark:fill-stone-200"}`}
								dominantBaseline="central"
								textAnchor="middle"
								x={x}
								y={y}
							>
								{index + 1}
							</text>
							<text
								className={`${small ? "text-[10px]" : "text-[12px]"} ${active ? "fill-stone-950 font-semibold dark:fill-white" : "fill-stone-700 dark:fill-stone-300"}`}
								dominantBaseline="central"
								textAnchor={anchor}
								x={lx}
								y={(small ? ly : ly - 6) + lift}
							>
								{item.name}
							</text>
							{small ? null : (
								<text
									className="fill-stone-400 text-[9.5px]"
									dominantBaseline="central"
									textAnchor={anchor}
									x={lx}
									y={ly + 8 + lift}
								>
									{item.short}
								</text>
							)}
						</g>
					);
				})}
			</svg>
			{guide.groups ? (
				<ul className="mt-2 flex justify-center gap-4 font-sans text-xs text-stone-500">
					{guide.groups.map((group, index) => (
						<li className="flex items-center gap-1.5" key={group}>
							<span
								aria-hidden="true"
								className={`size-2.5 rounded-full ${groupDots[index]}`}
							/>
							{group}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
};

/** Turning points along a line split into three acts. */
const TimelineDiagram = ({ guide, selected, onSelect }: DiagramProps) => {
	const acts = [
		{ name: "Act I · Setup", from: 0, to: 25 },
		{ name: "Act II · Confrontation", from: 25, to: 75 },
		{ name: "Act III · Resolution", from: 75, to: 100 },
	];
	return (
		<div className="px-4 font-sans">
			<div className="relative h-44">
				<div className="absolute inset-x-0 top-[4.5rem] flex h-3 overflow-hidden rounded-full">
					{acts.map((act, index) => (
						<div
							className={
								["bg-stone-200", "bg-stone-300", "bg-stone-200"][index] +
								" dark:bg-stone-700"
							}
							key={act.name}
							style={{ width: `${act.to - act.from}%` }}
						/>
					))}
				</div>
				{acts.map((act) => (
					<p
						className="absolute top-0 text-center text-[10px] tracking-[0.1em] text-stone-400 uppercase"
						key={act.name}
						style={{
							left: `${act.from}%`,
							width: `${act.to - act.from}%`,
						}}
					>
						{act.name}
					</p>
				))}
				{guide.steps.map((step, index) => {
					const active = index === selected;
					const below = index % 2 === 0;
					return (
						<button
							aria-label={`${index + 1}. ${step.name}`}
							className="group absolute top-[4.75rem] -translate-x-1/2"
							key={step.name}
							onClick={() => onSelect(index)}
							style={{ left: `${step.at ?? 0}%` }}
							type="button"
						>
							<span
								className={`block size-4 -translate-y-1/2 rounded-full border-2 transition-colors ${active ? "border-stone-900 bg-stone-900 dark:border-stone-100 dark:bg-stone-100" : "border-stone-500 bg-white group-hover:border-stone-900 dark:bg-stone-900"}`}
							/>
							<span
								className={`absolute left-1/2 w-24 -translate-x-1/2 text-center text-[11px] leading-tight ${below ? "top-4" : "-top-12"} ${active ? "font-semibold text-stone-950 dark:text-white" : "text-stone-600 dark:text-stone-300"}`}
							>
								{step.name}
								<span className="block text-[10px] text-stone-400">
									{step.at}%
								</span>
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

/** Steps in order, top to bottom, with the last one turning back to the first. */
const FlowDiagram = ({ guide, selected, onSelect }: DiagramProps) => (
	<ol className="relative mx-auto max-w-sm font-sans">
		{guide.steps.map((step, index) => {
			const active = index === selected;
			return (
				<li className="relative pb-3 pl-10 last:pb-0" key={step.name}>
					{index < guide.steps.length - 1 ? (
						<span
							aria-hidden="true"
							className="absolute top-8 bottom-0 left-[15px] w-px bg-stone-300 dark:bg-stone-600"
						/>
					) : null}
					<button
						className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${active ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900" : "border-stone-200 hover:border-stone-400 dark:border-stone-700"}`}
						onClick={() => onSelect(index)}
						type="button"
					>
						<span
							className={`absolute top-1.5 left-0 grid size-8 place-items-center rounded-full border text-xs font-semibold ${active ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900" : "border-stone-300 bg-white text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300"}`}
						>
							{index + 1}
						</span>
						<span className="block text-sm font-medium">{step.name}</span>
						<span
							className={`block text-xs ${active ? "text-white/70 dark:text-stone-600" : "text-stone-500"}`}
						>
							{step.short}
						</span>
					</button>
				</li>
			);
		})}
		<li className="mt-2 pl-10 text-xs text-stone-400">
			↺ The return should answer the question better than you could at the
			start.
		</li>
	</ol>
);

const StepDetail = ({
	step,
	index,
	count,
	onSelect,
}: {
	step: Guide["steps"][number];
	index: number;
	count: number;
	onSelect: (index: number) => void;
}) => {
	const arrow =
		"grid size-7 place-items-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-30 disabled:hover:border-stone-200 dark:border-stone-700 dark:hover:text-stone-100";
	return (
		<article
			aria-live="polite"
			className="border-t border-stone-200 pt-6 dark:border-stone-700"
		>
			<header className="flex items-start justify-between gap-3">
				<div>
					<p className="font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
						Step {index + 1} of {count}
						{step.at !== undefined ? ` · around ${step.at}%` : ""}
						{step.group ? ` · ${step.group}` : ""}
					</p>
					<h3 className="font-book mt-1 text-2xl">{step.name}</h3>
					<p className="font-book text-stone-500 italic">{step.short}</p>
				</div>
				<div className="flex shrink-0 gap-1.5 pt-1">
					<button
						aria-label="Previous step"
						className={arrow}
						disabled={index === 0}
						onClick={() => onSelect(index - 1)}
						type="button"
					>
						‹
					</button>
					<button
						aria-label="Next step"
						className={arrow}
						disabled={index === count - 1}
						onClick={() => onSelect(index + 1)}
						type="button"
					>
						›
					</button>
				</div>
			</header>
			<p className="font-book mt-4 text-[15.5px] leading-relaxed">
				{step.meaning}
			</p>
			<h4 className="mt-5 mb-1.5 font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
				Ask yourself
			</h4>
			<ul className="font-book grid list-disc gap-1 pl-5 text-[15px] marker:text-stone-300">
				{step.questions.map((question) => (
					<li key={question}>{question}</li>
				))}
			</ul>
			<h4 className="mt-5 mb-1.5 font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
				For example
			</h4>
			<blockquote className="font-book border-l-2 border-stone-200 pl-3 text-[15px] text-stone-600 italic dark:border-stone-700 dark:text-stone-300">
				{step.example}
			</blockquote>
		</article>
	);
};
