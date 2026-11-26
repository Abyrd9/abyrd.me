import { useEffect, useRef } from "react";

/**
 * A Julia-set fractal whose shape, framing, and colors come from `seed`, so
 * the same title always draws the same cover. Fills its parent.
 */
export const SeededArt = ({
	seed,
	className = "",
}: {
	/** Usually a title; any string works. */
	seed: string;
	className?: string;
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const scale = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.max(1, Math.round(canvas.clientWidth * scale));
		const height = Math.max(1, Math.round(canvas.clientHeight * scale));
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (context) drawJulia(context, width, height, seed);
	}, [seed]);

	return (
		// Decoration only; the title beside it names the item.
		<canvas
			className={`absolute inset-0 size-full ${className}`}
			ref={canvasRef}
		/>
	);
};

const MAX_STEPS = 90;

function drawJulia(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	seed: string,
) {
	const random = mulberry32(hash(seed.trim().toLowerCase() || "untitled"));
	// Constants on this circle sit near the Mandelbrot set's edge, where Julia
	// sets are connected and detailed rather than dust or a plain blob.
	const angle = random() * Math.PI * 2;
	const radius = 0.7885 - random() * 0.03;
	const cx = radius * Math.cos(angle);
	const cy = radius * Math.sin(angle);
	// Frame the whole set, slightly off center, so every cover shows its shape.
	const zoom = 1.25 + random() * 0.45;
	const turn = random() * Math.PI * 2;
	const offsetX = (random() - 0.5) * 0.25;
	const offsetY = (random() - 0.5) * 0.25;
	// Four related colors: a deep background that glows toward bright edges.
	// The accent sits a seeded step around the color wheel from the base.
	const hue = random() * 360;
	const accent = hue + 140 + random() * 80;
	const stops = [
		hsl(hue, 0.65, 0.1),
		hsl(hue + 25, 0.85, 0.38),
		hsl(accent, 0.95, 0.6),
		hsl(accent + 30, 1, 0.9),
	];
	const inside = hsl(hue, 0.55, 0.06);

	const image = context.createImageData(width, height);
	const cos = Math.cos(turn);
	const sin = Math.sin(turn);
	const unit = 3 / zoom / Math.min(width, height);
	for (let py = 0; py < height; py++) {
		for (let px = 0; px < width; px++) {
			const u = (px - width / 2) * unit;
			const v = (py - height / 2) * unit;
			let x = u * cos - v * sin + offsetX;
			let y = u * sin + v * cos + offsetY;
			let step = 0;
			let size = x * x + y * y;
			while (size < 256 && step < MAX_STEPS) {
				const next = x * x - y * y + cx;
				y = 2 * x * y + cy;
				x = next;
				size = x * x + y * y;
				step++;
			}
			const index = (py * width + px) * 4;
			if (step === MAX_STEPS) {
				image.data[index] = inside[0];
				image.data[index + 1] = inside[1];
				image.data[index + 2] = inside[2];
			} else {
				// Smooth escape count, so bands blend instead of stepping. Points
				// that take longest to escape hug the set and glow brightest.
				const t = Math.min(
					1,
					Math.sqrt(
						(step + 1 - Math.log2(Math.log2(size) / 2)) / (MAX_STEPS * 0.35),
					),
				);
				const color = blend(stops, Math.max(0, t));
				image.data[index] = color[0];
				image.data[index + 1] = color[1];
				image.data[index + 2] = color[2];
			}
			image.data[index + 3] = 255;
		}
	}
	context.putImageData(image, 0, 0);
}

/** Mixes evenly spaced color stops at t in [0, 1]. */
function blend(stops: number[][], t: number) {
	const at = t * (stops.length - 1);
	const index = Math.min(Math.floor(at), stops.length - 2);
	const mix = at - index;
	return stops[index].map((channel, i) =>
		Math.round(channel + (stops[index + 1][i] - channel) * mix),
	);
}

/** HSL to RGB; hue in degrees, saturation and lightness in [0, 1]. */
function hsl(hue: number, saturation: number, lightness: number) {
	const h = (((hue % 360) + 360) % 360) / 30;
	const a = saturation * Math.min(lightness, 1 - lightness);
	return [0, 8, 4].map((n) => {
		const k = (n + h) % 12;
		return Math.round(
			255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
		);
	});
}

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
