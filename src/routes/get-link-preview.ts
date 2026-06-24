import { isIP } from "node:net";

export async function getLinkPreview(req: Request) {
	try {
		const url = new URL(req.url).searchParams.get("url");
		if (!url) {
			return Response.json(
				{ error: "URL parameter is required" },
				{ status: 400 },
			);
		}

		let targetUrl: URL;
		try {
			targetUrl = new URL(url);
		} catch {
			return Response.json({ error: "Invalid URL" }, { status: 400 });
		}

		if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
			return Response.json(
				{ error: "URL must use http or https" },
				{ status: 400 },
			);
		}
		if (_isPrivateHostname(targetUrl.hostname)) {
			return Response.json(
				{ error: "URL must not target localhost or a private network" },
				{ status: 400 },
			);
		}

		const response = await fetch(targetUrl.toString(), {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
			},
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.status}`);
		}

		const html = await response.text();
		const metadata = {
			title:
				_extractMetaTag(html, "og:title") ||
				_extractMetaTag(html, "twitter:title") ||
				_extractTitleTag(html) ||
				targetUrl.hostname,
			description:
				_extractMetaTag(html, "og:description") ||
				_extractMetaTag(html, "twitter:description") ||
				_extractMetaTag(html, "description") ||
				"",
			image:
				_extractMetaTag(html, "og:image:secure_url") ||
				_extractMetaTag(html, "og:image") ||
				_extractMetaTag(html, "twitter:image:src") ||
				_extractMetaTag(html, "twitter:image") ||
				null,
			domain: targetUrl.hostname,
			url: targetUrl.toString(),
		};

		return Response.json(metadata, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch (error) {
		return Response.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to fetch preview",
			},
			{ status: 500 },
		);
	}
}

function _extractMetaTag(html: string, property: string): string | null {
	const patterns = [
		new RegExp(
			`<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`,
			"i",
		),
		new RegExp(
			`<meta\\s+content=["']([^"']+)["']\\s+property=["']${property}["']`,
			"i",
		),
		new RegExp(
			`<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`,
			"i",
		),
		new RegExp(
			`<meta\\s+content=["']([^"']+)["']\\s+name=["']${property}["']`,
			"i",
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

function _extractTitleTag(html: string): string | null {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return match?.[1] ? match[1].trim() : null;
}

function _isPrivateHostname(hostname: string) {
	const normalizedHostname = hostname
		.trim()
		.toLowerCase()
		.replace(/^\[(.*)\]$/, "$1");

	if (
		normalizedHostname === "localhost" ||
		normalizedHostname.endsWith(".localhost") ||
		normalizedHostname === "0.0.0.0"
	) {
		return true;
	}

	const ipType = isIP(normalizedHostname);
	if (ipType === 4) return _isPrivateIpv4(normalizedHostname);
	if (ipType === 6) return _isPrivateIpv6(normalizedHostname);

	return false;
}

function _isPrivateIpv4(hostname: string) {
	const [firstOctet, secondOctet] = hostname.split(".").map(Number);

	return (
		firstOctet === 10 ||
		firstOctet === 127 ||
		(firstOctet === 169 && secondOctet === 254) ||
		(firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
		(firstOctet === 192 && secondOctet === 168)
	);
}

function _isPrivateIpv6(hostname: string) {
	return (
		hostname === "::1" ||
		hostname === "::" ||
		hostname.startsWith("fc") ||
		hostname.startsWith("fd") ||
		hostname.startsWith("fe80:")
	);
}
