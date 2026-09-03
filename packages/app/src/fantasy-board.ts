const storageKey = "abyrd.fantasy-board";

export type FantasyPlayerStatus = "gone" | "mine";
export type FantasyBoardState = Record<string, FantasyPlayerStatus>;

type FantasyBoardDocument = {
	version: 1;
	players: FantasyBoardState;
};

export type FantasyBoardStorage = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
};

export function toggleFantasyPlayerStatus(
	state: FantasyBoardState,
	player: string,
	status: FantasyPlayerStatus,
) {
	const next = { ...state };

	if (next[player] === status) {
		delete next[player];
	} else {
		next[player] = status;
	}

	return next;
}

export function readFantasyBoardState(
	storage = browserStorage(),
): FantasyBoardState {
	if (!storage) return {};

	try {
		const saved = storage.getItem(storageKey);
		if (!saved) return {};

		const document: unknown = JSON.parse(saved);
		if (!isRecord(document) || document.version !== 1) return {};
		if (!isRecord(document.players)) return {};

		return Object.fromEntries(
			Object.entries(document.players).filter(
				(entry): entry is [string, FantasyPlayerStatus] =>
					entry[1] === "gone" || entry[1] === "mine",
			),
		);
	} catch {
		return {};
	}
}

export function writeFantasyBoardState(
	players: FantasyBoardState,
	storage = browserStorage(),
) {
	if (!storage) return;

	const document: FantasyBoardDocument = { version: 1, players };

	try {
		storage.setItem(storageKey, JSON.stringify(document));
	} catch {
		// The board still works when browser storage is blocked.
	}
}

export function clearFantasyBoardState(storage = browserStorage()) {
	if (!storage) return;

	try {
		storage.removeItem(storageKey);
	} catch {
		// The board still works when browser storage is blocked.
	}
}

function browserStorage(): FantasyBoardStorage | undefined {
	if (typeof window === "undefined") return undefined;

	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
