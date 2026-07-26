import { expect, test } from "bun:test";
import {
	clearAlgorithmProgress,
	type ProgressStorage,
	readAlgorithmProgress,
	writeAlgorithmProgress,
} from "./algorithm-progress";

function createStorage(
	saved?: string,
): ProgressStorage & { value: string | null } {
	return {
		value: saved ?? null,
		getItem() {
			return this.value;
		},
		setItem(_key, value) {
			this.value = value;
		},
		removeItem() {
			this.value = null;
		},
	};
}

test("reads no progress when storage is empty", () => {
	const storage = createStorage();

	expect(readAlgorithmProgress(storage)).toEqual(new Set());
});

test("round trips completed lesson ids", () => {
	const storage = createStorage();

	writeAlgorithmProgress(new Set(["two-pointers", "tree-dfs"]), storage);

	expect(readAlgorithmProgress(storage)).toEqual(
		new Set(["two-pointers", "tree-dfs"]),
	);
});

test("ignores malformed and old progress", () => {
	const malformed = createStorage("not-json");
	const old = createStorage(
		JSON.stringify({ version: 0, completedLessonIds: ["two-pointers"] }),
	);

	expect(readAlgorithmProgress(malformed)).toEqual(new Set());
	expect(readAlgorithmProgress(old)).toEqual(new Set());
});

test("clears saved progress", () => {
	const storage = createStorage();
	writeAlgorithmProgress(new Set(["two-pointers"]), storage);

	clearAlgorithmProgress(storage);

	expect(readAlgorithmProgress(storage)).toEqual(new Set());
});
