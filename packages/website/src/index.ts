import { serve } from "bun";
import "@fontsource-variable/dm-sans";
import fourOhFour from "./404.html";
import index from "./index.html";
import blog_post_2025_12_10_hello_world from "./posts/2025-12-10-hello-world.html";
import blog_post_2025_12_18_on_intellectual_humility from "./posts/2025-12-18-on-intellectual-humility.html";
import blog_post_2026_02_08_the_old_internet_isnt_dead_yet from "./posts/2026-02-08-the-old-internet-isnt-dead-yet.html";
import resume from "./resume.html";
import { getPostsList } from "./routes/get-posts-list";
import { robots } from "./routes/robots";
import { sitemap } from "./routes/sitemap";

export const routes = {
	// ------------------------------------------------------------
	// BLOG ROUTES
	// ------------------------------------------------------------
	"/posts/2025-12-10-hello-world": blog_post_2025_12_10_hello_world,
	"/posts/2025-12-18-on-intellectual-humility":
		blog_post_2025_12_18_on_intellectual_humility,
	"/posts/2026-02-08-the-old-internet-isnt-dead-yet":
		blog_post_2026_02_08_the_old_internet_isnt_dead_yet,

	// ------------------------------------------------------------
	// API ROUTES
	// ------------------------------------------------------------
	"/api/posts": {
		async GET(req: Request) {
			return getPostsList(req);
		},
	},
	"/robots.txt": {
		async GET(req: Request) {
			return robots(req);
		},
		async HEAD(req: Request) {
			return robots(req);
		},
	},
	"/sitemap.xml": {
		async GET(req: Request) {
			return sitemap(req);
		},
		async HEAD(req: Request) {
			return sitemap(req);
		},
	},

	// ------------------------------------------------------------
	// PAGES
	// ------------------------------------------------------------
	"/": index,
	"/resume": resume,
} satisfies Parameters<typeof serve>[0]["routes"];

export const createServer = (
	port = process.env.PORT ? Number(process.env.PORT) : 3000,
) =>
	serve({
		port,
		routes,
		async fetch(request) {
			return handleUnmatchedRequest(request);
		},

		development: process.env.NODE_ENV !== "production" && {
			hmr: true,
			console: true,
		},
	});

export const server = import.meta.main ? createServer() : undefined;

if (server) {
	console.log(`🚀 Server running at ${server.url}`);
}

export async function handleUnmatchedRequest(request: Request) {
	const asset = await _buildAssetResponse(request);

	if (asset) return asset;

	return new Response(Bun.file(new URL(fourOhFour.index, import.meta.url)), {
		status: 404,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

/** Every file in the production build directory is a public website asset. */
async function _buildAssetResponse(request: Request) {
	if (request.method !== "GET" && request.method !== "HEAD") return;

	const assetPath = _buildAssetPath(new URL(request.url).pathname);

	if (!assetPath) return;

	const asset = Bun.file(`${process.cwd()}/${assetPath}`);

	if (!(await asset.exists())) return;

	return new Response(asset);
}

function _buildAssetPath(pathname: string) {
	let decodedPath: string;

	try {
		decodedPath = decodeURIComponent(pathname);
	} catch {
		return;
	}

	const pathSegments = decodedPath.split("/").filter(Boolean);

	if (pathSegments.length === 0) return;
	if (pathSegments.some((segment) => segment === "." || segment === ".."))
		return;

	return pathSegments.join("/");
}
