import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { createServer, handleUnmatchedRequest, routes } = await import(
	"./index"
);
const testPort = 30_000 + (process.pid % 10_000);

test("does not expose the unused link preview proxy", async () => {
	const server = createServer(testPort);

	try {
		const response = await fetch(
			new URL("/api/link-preview?url=https://example.com", server.url),
		);

		expect(response.status).toBe(404);
	} finally {
		server.stop(true);
	}
});

test("returns a real 404 response for missing pages", async () => {
	const response = handleUnmatchedRequest();

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
		expect(stylesheet).toContain(".min-h-dvh");
		expect(stylesheet).toContain("DM Sans Variable");
		expect(homepage).toContain('id="nav-logo"');
		expect(await favicon.exists()).toBe(true);
	} finally {
		await rm(outputDirectory, { force: true, recursive: true });
	}
});

test("crawl routes support HEAD requests", async () => {
	const server = createServer(testPort);

	try {
		for (const path of ["/robots.txt", "/sitemap.xml"] as const) {
			const response = await fetch(new URL(path, server.url), {
				method: "HEAD",
			});

			expect(response.status).toBe(200);
		}
	} finally {
		server.stop(true);
	}
});

test("includes the resume in the sitemap", async () => {
	const response = await routes["/sitemap.xml"].GET(
		new Request("http://localhost/sitemap.xml"),
	);

	expect(await response.text()).toContain("<loc>http://localhost/resume</loc>");
});
