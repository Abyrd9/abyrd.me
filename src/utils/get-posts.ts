export interface PostMetadata {
	slug: string;
	title: string;
	description: string;
	date: string;
	dateFormatted: string;
	path: string;
	tag?: string;
	tags?: string[];
}

function extractMetaTag(html: string, property: string): string | null {
	const patterns = [
		new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]+)"`, "i"),
		new RegExp(`<meta\\s+content="([^"]+)"\\s+property="${property}"`, "i"),
		new RegExp(`<meta\\s+name="${property}"\\s+content="([^"]+)"`, "i"),
		new RegExp(`<meta\\s+content="([^"]+)"\\s+name="${property}"`, "i"),
		new RegExp(`<meta\\s+property='${property}'\\s+content='([^']+)'`, "i"),
		new RegExp(`<meta\\s+content='([^']+)'\\s+property='${property}'`, "i"),
		new RegExp(`<meta\\s+name='${property}'\\s+content='([^']+)'`, "i"),
		new RegExp(`<meta\\s+content='([^']+)'\\s+name='${property}'`, "i"),
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return match[1].trim();
		}
	}

	return null;
}

function extractMetaTags(html: string, property: string) {
	const metaTagMatches = html.match(/<meta\s+[^>]*>/gi) || [];
	const collectedValues: string[] = [];

	for (const metaTag of metaTagMatches) {
		const propertyMatch = metaTag.match(
			/\b(?:property|name)=['"]([^'"]+)['"]/i,
		);
		const contentMatch = metaTag.match(/\bcontent=['"]([^'"]+)['"]/i);

		if (!propertyMatch?.[1] || !contentMatch?.[1]) {
			continue;
		}

		if (propertyMatch[1].toLowerCase() === property.toLowerCase()) {
			collectedValues.push(contentMatch[1].trim());
		}
	}

	return Array.from(new Set(collectedValues));
}

function extractTimeTag(
	html: string,
): { date: string; formatted: string } | null {
	const match = html.match(
		/<time[^>]*datetime=["']([^"']+)["'][^>]*>([^<]+)<\/time>/i,
	);
	if (match?.[1] && match?.[2]) {
		return {
			date: match[1].trim(),
			formatted: match[2].trim(),
		};
	}
	return null;
}

export async function getPosts(): Promise<PostMetadata[]> {
	const postsDir = `${import.meta.dir}/../posts`;
	const glob = new Bun.Glob("*.html");
	const posts: PostMetadata[] = [];

	// Scan all HTML files in the posts directory
	for await (const fileName of glob.scan(postsDir)) {
		const filePath = `${postsDir}/${fileName}`;
		const file = Bun.file(filePath);
		const html = await file.text();

		// Extract metadata
		const title =
			extractMetaTag(html, "og:title") || fileName.replace(".html", "");
		const description = extractMetaTag(html, "og:description") || "";
		const tags = extractMetaTags(html, "article:tag");
		const timeData = extractTimeTag(html);

		posts.push({
			slug: fileName.replace(".html", ""),
			title,
			description,
			date: timeData?.date || "",
			dateFormatted: timeData?.formatted || "",
			path: `/posts/${fileName.replace(".html", "")}`,
			tag: tags[0],
			tags: tags.length ? tags : undefined,
		});
	}

	// Sort by date (newest first)
	posts.sort((a, b) => {
		if (!a.date || !b.date) return 0;
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	return posts;
}
