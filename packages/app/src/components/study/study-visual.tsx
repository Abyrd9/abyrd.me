import { useEffect, useId, useState } from "react";
import type { StudyVisualSpec } from "#/server/study-visuals";

const playbackDelay = 1600;

export function StudyVisual({ visual }: { visual: StudyVisualSpec }) {
	const [frameIndex, setFrameIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const titleId = useId();
	const markerId = useId().replaceAll(":", "");
	const activeMarkerId = useId().replaceAll(":", "");
	const lastFrameIndex = visual.frames.length - 1;
	const frame = visual.frames[frameIndex];
	const activeNodes = new Set(frame.activeNodes);
	const activeEdges = new Set(frame.activeEdges ?? []);

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const updatePreference = () => setPrefersReducedMotion(media.matches);

		updatePreference();
		media.addEventListener("change", updatePreference);
		return () => media.removeEventListener("change", updatePreference);
	}, []);

	useEffect(() => {
		if (!isPlaying || prefersReducedMotion) return;

		const timeout = window.setTimeout(() => {
			if (frameIndex === lastFrameIndex) {
				setIsPlaying(false);
				return;
			}

			setFrameIndex(frameIndex + 1);
		}, playbackDelay);

		return () => window.clearTimeout(timeout);
	}, [frameIndex, isPlaying, lastFrameIndex, prefersReducedMotion]);

	function chooseFrame(index: number) {
		setIsPlaying(false);
		setFrameIndex(index);
	}

	function togglePlayback() {
		if (prefersReducedMotion) {
			setFrameIndex((current) =>
				current === lastFrameIndex ? 0 : current + 1,
			);
			return;
		}

		if (isPlaying) {
			setIsPlaying(false);
			return;
		}

		if (frameIndex === lastFrameIndex) setFrameIndex(0);
		setIsPlaying(true);
	}

	return (
		<figure className="study-visual mt-6 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
			<header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
				<div className="min-w-0">
					<p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
						Living diagram
					</p>
					<h3 className="mt-1 break-words text-sm font-semibold text-slate-950 sm:text-base">
						{visual.title}
					</h3>
				</div>
				<span className="shrink-0 font-mono text-xs text-slate-500">
					{frameIndex + 1} / {visual.frames.length}
				</span>
			</header>

			<p className="px-4 pt-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:hidden">
				Swipe to follow the diagram →
			</p>
			<div className="max-w-full overflow-x-auto px-2 pt-2 sm:px-4">
				<svg
					aria-labelledby={titleId}
					className="block h-auto min-w-[36rem] sm:min-w-0 sm:w-full"
					role="img"
					viewBox="0 0 640 300"
				>
					<title id={titleId}>
						{visual.title}. {frame.note}
					</title>
					<defs>
						<marker
							id={markerId}
							markerHeight="7"
							markerWidth="7"
							orient="auto-start-reverse"
							refX="7"
							refY="3.5"
							viewBox="0 0 7 7"
						>
							<path className="study-visual-marker" d="M0 0 L7 3.5 L0 7 Z" />
						</marker>
						<marker
							id={activeMarkerId}
							markerHeight="7"
							markerWidth="7"
							orient="auto-start-reverse"
							refX="7"
							refY="3.5"
							viewBox="0 0 7 7"
						>
							<path
								className="study-visual-marker-active"
								d="M0 0 L7 3.5 L0 7 Z"
							/>
						</marker>
					</defs>

					{visual.edges.map((edge) => {
						const from = visual.nodes.find((node) => node.id === edge.from);
						const to = visual.nodes.find((node) => node.id === edge.to);
						if (!from || !to) return null;

						const distance = Math.hypot(to.x - from.x, to.y - from.y);
						const directionX = (to.x - from.x) / distance;
						const directionY = (to.y - from.y) / distance;
						const startInset = from.shape === "circle" ? 40 : 54;
						const endInset = to.shape === "circle" ? 44 : 58;
						const isActive = activeEdges.has(edge.id);
						return (
							<g key={edge.id}>
								<line
									className={
										isActive
											? "study-visual-edge study-visual-edge-active"
											: "study-visual-edge"
									}
									markerEnd={`url(#${isActive ? activeMarkerId : markerId})`}
									markerStart={
										edge.bidirectional
											? `url(#${isActive ? activeMarkerId : markerId})`
											: undefined
									}
									x1={from.x + directionX * startInset}
									x2={to.x - directionX * endInset}
									y1={from.y + directionY * startInset}
									y2={to.y - directionY * endInset}
								/>
								{edge.label ? (
									<text
										className="study-visual-edge-label"
										x={(from.x + to.x) / 2}
										y={(from.y + to.y) / 2 - 8}
									>
										{edge.label}
									</text>
								) : null}
							</g>
						);
					})}

					{visual.nodes.map((node) => {
						const isActive = activeNodes.has(node.id);
						const isCircle = node.shape === "circle";
						return (
							<g
								className={isActive ? "study-visual-node-active" : undefined}
								key={node.id}
							>
								{isCircle ? (
									<circle
										className="study-visual-node"
										cx={node.x}
										cy={node.y}
										r="38"
									/>
								) : (
									<rect
										className="study-visual-node"
										height="48"
										rx={node.shape === "pill" ? 24 : 10}
										width="136"
										x={node.x - 68}
										y={node.y - 24}
									/>
								)}
								<text className="study-visual-node-label" x={node.x} y={node.y}>
									{node.label}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			<figcaption className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
					{frame.label}
				</p>
				<p
					aria-live="polite"
					className="mt-1.5 min-h-12 leading-6 text-slate-700"
				>
					{frame.note}
				</p>

				<div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3">
					<button
						aria-label="Previous diagram frame"
						className="study-visual-control"
						disabled={frameIndex === 0}
						onClick={() => chooseFrame(frameIndex - 1)}
						type="button"
					>
						← <span className="hidden sm:inline">Previous</span>
					</button>

					<fieldset
						aria-label="Diagram frames"
						className="m-0 flex min-w-0 items-center justify-center gap-1.5 overflow-x-auto border-0 px-1 py-1 sm:gap-2"
					>
						{visual.frames.map((item, index) => (
							<button
								aria-label={`Show ${item.label.toLowerCase()}`}
								aria-pressed={index === frameIndex}
								className="study-visual-dot"
								key={item.label}
								onClick={() => chooseFrame(index)}
								type="button"
							/>
						))}
					</fieldset>

					<button
						aria-label={
							prefersReducedMotion
								? "Advance diagram one frame"
								: isPlaying
									? "Pause diagram"
									: "Play diagram"
						}
						className="study-visual-control"
						onClick={togglePlayback}
						type="button"
					>
						{prefersReducedMotion
							? "Step"
							: isPlaying
								? "Pause"
								: frameIndex === lastFrameIndex
									? "Replay"
									: "Play"}
					</button>

					<button
						aria-label="Next diagram frame"
						className="study-visual-control"
						disabled={frameIndex === lastFrameIndex}
						onClick={() => chooseFrame(frameIndex + 1)}
						type="button"
					>
						<span className="hidden sm:inline">Next</span> →
					</button>
				</div>
			</figcaption>
		</figure>
	);
}
