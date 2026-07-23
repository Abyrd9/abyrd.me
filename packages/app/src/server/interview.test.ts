import { expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
	getCurrentBriefings,
	getInterviewCatalog,
	getInterviewGuide,
	getInterviewNumbers,
	getInterviewRehearsal,
} from "./interview";

test("loads the 20 rehearsal core without guides", async () => {
	const catalog = await Effect.runPromise(getInterviewCatalog());
	const serialized = JSON.stringify(catalog);

	expect(catalog).toHaveLength(20);
	expect(catalog.filter((item) => item.track === "coding")).toHaveLength(10);
	expect(catalog.filter((item) => item.track === "system-design")).toHaveLength(
		10,
	);
	expect(serialized).not.toContain("Reference approach");
	expect(serialized).not.toContain("commonMisses");
});

test("only sends a guide after the rehearsal is requested", async () => {
	const rehearsal = await Effect.runPromise(getInterviewRehearsal("two-sum"));
	const guide = await Effect.runPromise(getInterviewGuide("two-sum"));

	expect(JSON.stringify(rehearsal)).not.toContain(
		"Uses a map from value to index",
	);
	expect(guide.answer).toContain("map");
	expect(guide.checklist).toContain("Uses a map from value to index.");
});

test("loads dated source-backed briefing cards", async () => {
	const briefings = await Effect.runPromise(getCurrentBriefings());

	expect(briefings.length).toBeGreaterThan(0);
	expect(briefings[0].sourceUrl).toStartWith("https://");
	expect(briefings[0].checkedOn).toMatch(/^2026-\d{2}-\d{2}$/);
});

test("loads source-backed system design numbers", async () => {
	const numbers = await Effect.runPromise(getInterviewNumbers());

	expect(numbers).toHaveLength(6);
	expect(numbers.find((item) => item.id === "ebs-volume-size")?.number).toBe(
		"Up to 64 TiB",
	);
	for (const item of numbers) {
		expect(item.sourceUrl).toStartWith("https://");
		expect(item.checkedOn).toMatch(/^2026-\d{2}-\d{2}$/);
	}
});

test("reports an unknown rehearsal as a typed failure", async () => {
	const exit = await Effect.runPromiseExit(getInterviewGuide("missing"));
	expect(Exit.isFailure(exit)).toBe(true);
});
