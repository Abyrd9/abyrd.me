import type { ReactNode } from "react";

/**
 * A tiled mosaic whose palette, motifs, and layout come from `seed`, so the
 * same title always draws the same cover. Some tiles split into four smaller
 * ones. Fills its parent, cropping to fit.
 */
export const SeededArt = ({
	seed,
	className = "",
}: {
	/** Usually a title; any string works. */
	seed: string;
	className?: string;
}) => {
	const random = mulberry32(hash(seed.trim().toLowerCase() || "untitled"));
	const colors = palette(random);
	const tiles: ReactNode[] = [];
	for (let row = 0; row < ROWS; row++)
		for (let column = 0; column < COLUMNS; column++)
			drawTile(tiles, random, colors, column, row, 1, 0);

	return (
		<svg
			aria-hidden="true"
			className={`absolute inset-0 size-full ${className}`}
			preserveAspectRatio="xMidYMid slice"
			viewBox={`0 0 ${COLUMNS} ${ROWS}`}
		>
			{tiles}
		</svg>
	);
};

// Tall enough for a page, wide enough for a folder front once cropped.
const COLUMNS = 4;
const ROWS = 6;

/** Five colors around one seeded hue: two deep, two bright, one light. */
function palette(random: () => number) {
	const hue = random() * 360;
	const accent = hue + 150 + random() * 60;
	return [
		hsl(hue, 70, 22),
		hsl(hue + 20, 85, 48),
		hsl(accent, 90, 58),
		hsl(accent + 35, 95, 66),
		hsl(hue + 40, 60, 92),
	];
}

function drawTile(
	tiles: ReactNode[],
	random: () => number,
	colors: string[],
	x: number,
	y: number,
	size: number,
	depth: number,
) {
	if (depth < 2 && random() < 0.22 - depth * 0.08) {
		const half = size / 2;
		for (const [dx, dy] of [
			[0, 0],
			[half, 0],
			[0, half],
			[half, half],
		])
			drawTile(tiles, random, colors, x + dx, y + dy, half, depth + 1);
		return;
	}

	const pick = () => colors[Math.floor(random() * colors.length)];
	const background = pick();
	let shape = pick();
	while (shape === background) shape = pick();
	const turn = Math.floor(random() * 4) * 90;
	const cx = x + size / 2;
	const cy = y + size / 2;
	const key = tiles.length;
	const motif = Math.floor(random() * 6);
	const r = size;
	// Each motif is drawn for the top-left corner, then rotated in place.
	const figure =
		motif === 0 ? (
			<path d={`M${x} ${y}h${r}a${r} ${r} 0 0 1 -${r} ${r}z`} fill={shape} />
		) : motif === 1 ? (
			<path
				d={`M${x} ${y}h${r}a${r / 2} ${r / 2} 0 0 1 -${r} 0z`}
				fill={shape}
			/>
		) : motif === 2 ? (
			<circle cx={cx} cy={cy} fill={shape} r={size * 0.34} />
		) : motif === 3 ? (
			<path d={`M${x} ${y}h${r}L${x} ${y + r}z`} fill={shape} />
		) : motif === 4 ? (
			<>
				<path
					d={`M${x} ${y}h${r / 2}a${r / 2} ${r / 2} 0 0 1 -${r / 2} ${r / 2}z`}
					fill={shape}
				/>
				<path
					d={`M${x + r} ${y + r}h-${r / 2}a${r / 2} ${r / 2} 0 0 1 ${r / 2} -${r / 2}z`}
					fill={shape}
				/>
			</>
		) : (
			<path
				d={`M${cx} ${y + size * 0.15}L${x + size * 0.85} ${cy}L${cx} ${y + size * 0.85}L${x + size * 0.15} ${cy}z`}
				fill={shape}
			/>
		);

	tiles.push(
		<g key={key} transform={`rotate(${turn} ${cx} ${cy})`}>
			{/* Slight overlap hides hairline seams between tiles. */}
			<rect
				fill={background}
				height={size + 0.01}
				width={size + 0.01}
				x={x}
				y={y}
			/>
			{figure}
		</g>,
	);
}

const hsl = (hue: number, saturation: number, lightness: number) =>
	`hsl(${Math.round(hue % 360)} ${saturation}% ${lightness}%)`;

/** FNV-1a: a small, stable string hash. */
function hash(text: string) {
	let value = 2166136261;
	for (let i = 0; i < text.length; i++) {
		value ^= text.charCodeAt(i);
		value = Math.imul(value, 16777619);
	}
	return value >>> 0;
}

/** A seeded random number generator returning values in [0, 1). */
function mulberry32(seed: number) {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
