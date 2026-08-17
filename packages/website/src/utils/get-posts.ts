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

function _extractMetaTag(html: string, property: string): string | null {
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

function _extractMetaTags(html: string, property: string) {
	const metaTags = html.match(/<meta\s+[^>]*>/gi) || [];
	const values: string[] = [];

	for (const metaTag of metaTags) {
		const propertyMatch = metaTag.match(
			/\b(?:property|name)=['"]([^'"]+)['"]/i,
		);
		const contentMatch = metaTag.match(/\bcontent=['"]([^'"]+)['"]/i);

		if (!propertyMatch?.[1] || !contentMatch?.[1]) continue;
		if (propertyMatch[1].toLowerCase() !== property.toLowerCase()) continue;

		values.push(contentMatch[1].trim());
	}

	return Array.from(new Set(values));
}

function _extractTimeTag(
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
	const postsDir = `${import.meta.dir}/${process.env.NODE_ENV === "production" ? "" : "../"}posts`;
	const glob = new Bun.Glob("*.html");
	const posts: PostMetadata[] = [];

	for await (const fileName of glob.scan(postsDir)) {
		const filePath = `${postsDir}/${fileName}`;
		const file = Bun.file(filePath);
		const html = await file.text();
		const slug = fileName.replace(".html", "");

		const title = _extractMetaTag(html, "og:title") || slug;
		const description = _extractMetaTag(html, "og:description") || "";
		const tags = _extractMetaTags(html, "article:tag");
		const timeData = _extractTimeTag(html);

		posts.push({
			slug,
			title,
			description,
			date: timeData?.date || "",
			dateFormatted: timeData?.formatted || "",
			path: `/posts/${slug}`,
			tag: tags[0],
			tags: tags.length ? tags : undefined,
		});
	}

	posts.sort((a, b) => {
		const aTime = a.date
			? new Date(a.date).getTime()
			: Number.NEGATIVE_INFINITY;
		const bTime = b.date
			? new Date(b.date).getTime()
			: Number.NEGATIVE_INFINITY;

		return bTime - aTime;
	});

	return posts;
}
