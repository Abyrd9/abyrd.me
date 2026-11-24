// Common book trim sizes, in inches. Margins and type size follow typical
// print layouts so a page here holds roughly what a printed page would.
export const pageSizes = {
	pocket: {
		label: "Pocket · 4.25 × 6.87 in",
		width: 4.25,
		height: 6.87,
		margin: 0.6,
		fontPt: 10,
	},
	digest: {
		label: "Digest · 5.5 × 8.5 in",
		width: 5.5,
		height: 8.5,
		margin: 0.75,
		fontPt: 11,
	},
	trade: {
		label: "Trade · 6 × 9 in",
		width: 6,
		height: 9,
		margin: 0.8,
		fontPt: 11.5,
	},
	a5: {
		label: "A5 · 5.83 × 8.27 in",
		width: 5.83,
		height: 8.27,
		margin: 0.75,
		fontPt: 11,
	},
	letter: {
		label: "Manuscript · 8.5 × 11 in",
		width: 8.5,
		height: 11,
		margin: 1,
		fontPt: 12,
	},
} as const;

export type PageSizeId = keyof typeof pageSizes;

export const pageSizeIds = Object.keys(pageSizes) as [
	PageSizeId,
	...PageSizeId[],
];

export const toPageSizeId = (value: string): PageSizeId =>
	value in pageSizes ? (value as PageSizeId) : "trade";
