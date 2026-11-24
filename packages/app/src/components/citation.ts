// Citations follow Chicago note style, which reads well pasted into prose.

/** Wraps a passage in curly quotes, dropping straight quotes the source already added. */
export const formatQuotation = (text: string) =>
	`“${text.trim().replace(/^["“]+|["”]+$/g, "")}”`;

export const formatQuoteCitation = (source: {
	attribution: string | null;
	sourceTitle: string | null;
	sourceUrl: string | null;
}) => {
	const author = source.attribution?.trim();
	const title = source.sourceTitle?.trim();
	const url = source.sourceUrl ? cleanSourceUrl(source.sourceUrl) : null;
	if (!author && !title && !url) return "";

	// Chicago puts the comma inside a quoted web title: Author, “Title,” URL.
	const head = [author, title && (url ? `“${title},”` : title)]
		.filter(Boolean)
		.join(", ");
	if (!url) return `${head}.`;
	if (!head) return `${url}.`;
	return title ? `${head} ${url}.` : `${head}, ${url}.`;
};

export const formatKindleCitation = (source: {
	author: string;
	title: string;
	location: string | null;
	page: string | null;
}) => {
	const place = source.page
		? `p. ${source.page}`
		: source.location
			? `loc. ${source.location}`
			: null;
	const parts = [
		source.author.trim(),
		`${source.title.trim()} (Kindle edition)`,
		place,
	].filter(Boolean);

	return `${parts.join(", ")}.`;
};

/** Removes tracking parameters and fragments so the same page always matches. */
export const cleanSourceUrl = (value: string) => {
	if (!URL.canParse(value)) return value.trim();

	const url = new URL(value);
	for (const key of [...url.searchParams.keys()])
		if (key.startsWith("utm_")) url.searchParams.delete(key);
	url.hash = "";
	return url.toString();
};
