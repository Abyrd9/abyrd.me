import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { handleUnmatchedRequest, routes } = await import("./index");

test("does not expose the unused link preview proxy", async () => {
	const response = await handleUnmatchedRequest(
		new Request("http://localhost/api/link-preview?url=https://example.com"),
	);

	expect(response.status).toBe(404);
});

test("returns a real 404 response for missing pages", async () => {
	const response = await handleUnmatchedRequest(
		new Request("http://localhost/missing"),
	);

	expect(response.status).toBe(404);
	expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
});

test("production build processes Tailwind and injects shared HTML", async () => {
	const outputDirectory = await mkdtemp(join(tmpdir(), "abyrd-website-"));

	try {
		const build = Bun.spawn({
			cmd: ["bun", "run", "build.ts", outputDirectory],
			cwd: join(import.meta.dir, ".."),
			env: { ...process.env, NODE_ENV: "production" },
			stderr: "ignore",
			stdout: "ignore",
		});

		expect(await build.exited).toBe(0);

		const homepage = await Bun.file(join(outputDirectory, "index.html")).text();
		const faviconPath = homepage.match(
			/<link rel="icon"[^>]*href="([^"]+\.ico)"/,
		)?.[1];
		const stylesheetPath = homepage.match(
			/<link rel="stylesheet"[^>]*href="([^"]+\.css)">/,
		)?.[1];

		if (!faviconPath) throw new Error("Production homepage has no favicon.");
		if (!stylesheetPath)
			throw new Error("Production homepage has no stylesheet.");

		const stylesheet = await Bun.file(
			join(outputDirectory, stylesheetPath.replace(/^\.\//, "")),
		).text();
		const favicon = Bun.file(
			join(outputDirectory, faviconPath.replace(/^\.\//, "")),
		);
		const rootStylesheet = Bun.file(join(outputDirectory, "index.css"));

		expect(stylesheet).toContain(".min-h-dvh");
		expect(homepage).toContain('id="nav-logo"');
		expect(await favicon.exists()).toBe(true);
		expect(await rootStylesheet.exists()).toBe(true);
	} finally {
		await rm(outputDirectory, { force: true, recursive: true });
	}
});

test("crawl routes support HEAD requests", async () => {
	for (const path of ["/robots.txt", "/sitemap.xml"] as const) {
		const response = await routes[path].HEAD(
			new Request(`http://localhost${path}`, { method: "HEAD" }),
		);

		expect(response.status).toBe(200);
	}
});

test("includes the resume in the sitemap", async () => {
	const response = await routes["/sitemap.xml"].GET(
		new Request("http://localhost/sitemap.xml"),
	);

	expect(await response.text()).toContain("<loc>http://localhost/resume</loc>");
});
