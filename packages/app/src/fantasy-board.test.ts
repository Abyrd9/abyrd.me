import { expect, test } from "bun:test";
import {
	clearFantasyBoardState,
	type FantasyBoardStorage,
	readFantasyBoardState,
	toggleFantasyPlayerStatus,
	writeFantasyBoardState,
} from "./fantasy-board";

function createStorage(
	saved?: string,
): FantasyBoardStorage & { value: string | null } {
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

test("keeps Mine and Gone mutually exclusive", () => {
	const mine = toggleFantasyPlayerStatus({}, "Jahmyr Gibbs", "mine");
	const gone = toggleFantasyPlayerStatus(mine, "Jahmyr Gibbs", "gone");
	const available = toggleFantasyPlayerStatus(gone, "Jahmyr Gibbs", "gone");

	expect(mine).toEqual({ "Jahmyr Gibbs": "mine" });
	expect(gone).toEqual({ "Jahmyr Gibbs": "gone" });
	expect(available).toEqual({});
});

test("round trips board state and ignores invalid saved statuses", () => {
	const storage = createStorage();

	writeFantasyBoardState(
		{ "Jahmyr Gibbs": "mine", "Ja'Marr Chase": "gone" },
		storage,
	);

	expect(readFantasyBoardState(storage)).toEqual({
		"Jahmyr Gibbs": "mine",
		"Ja'Marr Chase": "gone",
	});

	storage.value = JSON.stringify({
		version: 1,
		players: { "Jahmyr Gibbs": "mine", "Ja'Marr Chase": "maybe" },
	});

	expect(readFantasyBoardState(storage)).toEqual({ "Jahmyr Gibbs": "mine" });

	clearFantasyBoardState(storage);
	expect(readFantasyBoardState(storage)).toEqual({});
});

test("still works when the browser blocks local storage", () => {
	const windowDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"window",
	);

	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: Object.defineProperty({}, "localStorage", {
			get() {
				throw new Error("blocked");
			},
		}),
	});

	try {
		expect(readFantasyBoardState()).toEqual({});
		expect(() =>
			writeFantasyBoardState({ "Jahmyr Gibbs": "mine" }),
		).not.toThrow();
		expect(() => clearFantasyBoardState()).not.toThrow();
	} finally {
		if (windowDescriptor) {
			Object.defineProperty(globalThis, "window", windowDescriptor);
		} else {
			Reflect.deleteProperty(globalThis, "window");
		}
	}
});
