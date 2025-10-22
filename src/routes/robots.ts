import { getDomainUrl } from "@/utils/helpers/get-domain-url";

const getRobotsTxt = (url: string) => `
User-agent: Googlebot
Disallow: /nogooglebot/

User-agent: *
Allow: /

Sitemap: ${url}/sitemap.xml
`;

export async function robots(req: Bun.BunRequest<"/robots.txt">) {
  const url = getDomainUrl(req);
  return new Response(getRobotsTxt(url), {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}