const storageKey = "abyrd.algorithm-progress";

type ProgressDocument = {
	version: 1;
	completedLessonIds: string[];
};

export type ProgressStorage = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
};

export function readAlgorithmProgress(
	storage = _browserStorage(),
): Set<string> {
	if (!storage) return new Set();

	try {
		const saved = storage.getItem(storageKey);
		if (!saved) return new Set();

		const document: unknown = JSON.parse(saved);
		if (!_isProgressDocument(document)) return new Set();

		return new Set(document.completedLessonIds);
	} catch {
		return new Set();
	}
}

export function writeAlgorithmProgress(
	completedLessonIds: ReadonlySet<string>,
	storage = _browserStorage(),
): void {
	if (!storage) return;

	const document: ProgressDocument = {
		version: 1,
		completedLessonIds: [...completedLessonIds],
	};

	try {
		storage.setItem(storageKey, JSON.stringify(document));
	} catch {
		// Progress is optional. Studying still works when storage is blocked.
	}
}

export function clearAlgorithmProgress(storage = _browserStorage()): void {
	if (!storage) return;

	try {
		storage.removeItem(storageKey);
	} catch {
		// Progress is optional. Studying still works when storage is blocked.
	}
}

function _browserStorage(): ProgressStorage | undefined {
	if (typeof window === "undefined") return undefined;
	return window.localStorage;
}

function _isProgressDocument(value: unknown): value is ProgressDocument {
	if (!value || typeof value !== "object") return false;

	const document = value as Partial<ProgressDocument>;
	return (
		document.version === 1 &&
		Array.isArray(document.completedLessonIds) &&
		document.completedLessonIds.every((id) => typeof id === "string")
	);
}
