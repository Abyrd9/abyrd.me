// Readers for saved Lexical editor state, used on the server where no editor
// is running. They accept unknown input because saved JSON is not trusted.

export const WIKI_LINK_TYPE = "wiki-link";

export const childOf = (value: unknown, key: string) =>
	value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;

export const childrenOf = (value: unknown) => {
	const children = childOf(value, "children");
	return Array.isArray(children) ? children : [];
};

export const typeOf = (value: unknown) => childOf(value, "type");

/** Plain text of a node, with wiki links read as their titles. */
export const textOf = (value: unknown): string => {
	const text = childOf(
		value,
		typeOf(value) === WIKI_LINK_TYPE ? "title" : "text",
	);
	if (typeof text === "string") return text;
	return childrenOf(value).map(textOf).join("");
};

/** The top-level blocks of a saved document, or nothing if it can't be read. */
export const rootBlocks = (content: string | null) => {
	if (!content) return [];
	try {
		return childrenOf(childOf(JSON.parse(content), "root"));
	} catch {
		return [];
	}
};
