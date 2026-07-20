import { getPosts } from "../utils/get-posts";
import { getDomainUrl } from "../utils/helpers/get-domain-url";

export async function sitemap(req: Bun.BunRequest<"/sitemap.xml">) {
	const url = getDomainUrl(req);
	const posts = await getPosts();

	return new Response(_getSitemapXml(url, posts), {
		status: 200,
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "public, max-age=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function _getSitemapXml(
	url: string,
	posts: Awaited<ReturnType<typeof getPosts>>,
) {
	const home = _getSitemapEntry(url, "1.0");
	const resume = _getSitemapEntry(`${url}/resume`, "0.8");
	const postEntries = posts.map((post) =>
		_getSitemapEntry(`${url}${post.path}`, "0.8", post.date),
	);

	return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	${[home, resume, ...postEntries].join("\n")}
  </urlset>`;
}

function _getSitemapEntry(
	url: string,
	priority: string,
	lastModified?: string,
) {
	const lastModifiedXml = lastModified
		? `\n      <lastmod>${lastModified}</lastmod>`
		: "";

	return `    <url>
      <loc>${url}</loc>${lastModifiedXml}
      <priority>${priority}</priority>
    </url>`;
}
