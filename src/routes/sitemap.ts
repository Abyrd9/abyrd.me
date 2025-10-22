import { getDomainUrl } from "@/utils/helpers/get-domain-url";

export async function sitemap(req: Bun.BunRequest<"/sitemap.xml">) {
  const url = getDomainUrl(req);
  return new Response(getSitemapXml(url), {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getSitemapXml(url: string) {
  let content = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // TODO: get posts from database
  const posts: { slug: string; updated_at: string }[] = [];

  for (const post of posts) {
    if (!post.slug || !post.updated_at) continue;

    content += `
      <url>
        <loc>${url}/${post.slug}</loc>
        <lastmod>${new Date(post.updated_at).toISOString().split("T")[0]}</lastmod>
        <priority>1.0</priority>
      </url>`;
  }

  content += "</urlset>";
  return content;
}