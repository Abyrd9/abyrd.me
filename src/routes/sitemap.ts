import { getPosts, type PostMetadata } from "@/utils/get-posts";
import { getDomainUrl } from "@/utils/helpers/get-domain-url";

export async function sitemap(req: Bun.BunRequest<"/sitemap.xml">) {
	const url = getDomainUrl(req);
	const posts = await getPosts();

	return new Response(getSitemapXml(url, posts), {
		status: 200,
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "public, max-age=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function getSitemapXml(url: string, posts: PostMetadata[]) {
	let content = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

	content += `
    <url>
      <loc>${url}/</loc>
      <priority>1.0</priority>
    </url>`;

	for (const post of posts) {
		if (!post.path) {
			continue;
		}

		content += `
      <url>
        <loc>${url}${post.path}</loc>`;

		if (post.date) {
			content += `
        <lastmod>${new Date(post.date).toISOString().split("T")[0]}</lastmod>`;
		}

		content += `
        <priority>0.8</priority>
      </url>`;
	}

	content += "</urlset>";
	return content;
}
