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

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

export const server = serve({
	port,
	routes: {
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
			async GET(req) {
				return getPostsList(req);
			},
		},
		"/robots.txt": {
			async GET(req) {
				return robots(req);
			},
			async HEAD(req) {
				return robots(req);
			},
		},
		"/sitemap.xml": {
			async GET(req) {
				return sitemap(req);
			},
			async HEAD(req) {
				return sitemap(req);
			},
		},

		// ------------------------------------------------------------
		// PAGES
		// ------------------------------------------------------------
		"/": index,
		"/resume": resume,
	},
	fetch() {
		return new Response(Bun.file(new URL(fourOhFour.index, import.meta.url)), {
			status: 404,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	},

	development: process.env.NODE_ENV !== "production" && {
		hmr: true,
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
