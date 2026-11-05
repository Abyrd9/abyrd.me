const storageKey = "kindle-library-position";

export function saveKindleLibraryPosition(asin: string) {
	try {
		sessionStorage.setItem(
			storageKey,
			JSON.stringify({
				path: location.pathname,
				asin,
				scroll: window.scrollY,
				query:
					document.querySelector<HTMLInputElement>(
						'input[placeholder="Title or author"]',
					)?.value ?? "",
				open: Array.from(
					document.querySelectorAll<HTMLDetailsElement>(
						"details[data-kindle-panel][open]",
					),
					(item) => item.dataset.kindlePanel,
				),
			}),
		);
	} catch {
		// The synopsis remains accessible if browser storage is unavailable.
	}
}

export function restoreKindleLibraryPosition(path: string, asin: string) {
	try {
		const raw = sessionStorage.getItem(storageKey);
		if (!raw) return null;
		const value: unknown = JSON.parse(raw);
		if (
			!value ||
			typeof value !== "object" ||
			!("path" in value) ||
			value.path !== path ||
			!("asin" in value) ||
			value.asin !== asin ||
			!("scroll" in value) ||
			typeof value.scroll !== "number" ||
			!("query" in value) ||
			typeof value.query !== "string" ||
			!("open" in value) ||
			!Array.isArray(value.open)
		)
			return null;
		return {
			scroll: value.scroll,
			query: value.query,
			open: value.open.filter(
				(item): item is string => typeof item === "string",
			),
		};
	} catch {
		return null;
	}
}
