import { expect, test } from "bun:test";
import {
	cleanSourceUrl,
	formatKindleCitation,
	formatQuotation,
	formatQuoteCitation,
} from "./citation";

test("wraps quotes in curly quotes without doubling existing ones", () => {
	expect(formatQuotation(" Know thyself. ")).toBe("“Know thyself.”");
	expect(formatQuotation("“Already quoted”")).toBe("“Already quoted”");
});

test("formats web quote citations from whatever source details exist", () => {
	const url = "https://www.econlib.org/library/Essays/hykKnw.html";
	expect(
		formatQuoteCitation({
			attribution: "F. A. Hayek",
			sourceTitle: "The Use of Knowledge in Society",
			sourceUrl: url,
		}),
	).toBe(`F. A. Hayek, “The Use of Knowledge in Society,” ${url}.`);
	expect(
		formatQuoteCitation({
			attribution: "Ronald Coase",
			sourceTitle: "The Nature of the Firm",
			sourceUrl: null,
		}),
	).toBe("Ronald Coase, The Nature of the Firm.");
	expect(
		formatQuoteCitation({
			attribution: "Coase",
			sourceTitle: null,
			sourceUrl: url,
		}),
	).toBe(`Coase, ${url}.`);
	expect(
		formatQuoteCitation({
			attribution: null,
			sourceTitle: null,
			sourceUrl: url,
		}),
	).toBe(`${url}.`);
	expect(
		formatQuoteCitation({
			attribution: null,
			sourceTitle: null,
			sourceUrl: null,
		}),
	).toBe("");
});

test("formats Kindle citations with the page or location", () => {
	const book = { author: "Matt Ridley", title: "The Rational Optimist" };
	expect(formatKindleCitation({ ...book, location: "1204", page: null })).toBe(
		"Matt Ridley, The Rational Optimist (Kindle edition), loc. 1204.",
	);
	expect(formatKindleCitation({ ...book, location: "1204", page: "88" })).toBe(
		"Matt Ridley, The Rational Optimist (Kindle edition), p. 88.",
	);
	expect(formatKindleCitation({ ...book, location: null, page: null })).toBe(
		"Matt Ridley, The Rational Optimist (Kindle edition).",
	);
});

test("strips tracking parameters and fragments from source links", () => {
	expect(
		cleanSourceUrl(
			"https://onlinelibrary.wiley.com/doi/full/10.1111/x?utm_source=chatgpt.com#top",
		),
	).toBe("https://onlinelibrary.wiley.com/doi/full/10.1111/x");
});
