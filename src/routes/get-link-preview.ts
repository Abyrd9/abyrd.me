export async function getLinkPreview(req: Bun.BunRequest<"/api/link-preview">) {
  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return Response.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the URL
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract metadata (prioritize higher quality images)
    const metadata = {
      title:
        extractMetaTag(html, "og:title") ||
        extractMetaTag(html, "twitter:title") ||
        extractTitleTag(html) ||
        targetUrl.hostname,
      description:
        extractMetaTag(html, "og:description") ||
        extractMetaTag(html, "twitter:description") ||
        extractMetaTag(html, "description") ||
        "",
      image:
        extractMetaTag(html, "og:image:secure_url") ||
        extractMetaTag(html, "og:image") ||
        extractMetaTag(html, "twitter:image:src") ||
        extractMetaTag(html, "twitter:image") ||
        null,
      domain: targetUrl.hostname,
      url: targetUrl.toString(),
    };

    return Response.json(metadata, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch preview",
      },
      { status: 500 }
    );
  }
}

// Helper functions for extracting metadata from HTML
function extractMetaTag(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+property=["']${property}["']`,
      "i"
    ),
    new RegExp(
      `<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+name=["']${property}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? match[1].trim() : null;
}