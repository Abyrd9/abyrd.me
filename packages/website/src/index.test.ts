import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = process.env.PORT;
process.env.PORT = "0";
const { server } = await import("./index");

afterAll(async () => {
	await server.stop(true);
	if (port === undefined) delete process.env.PORT;
	else process.env.PORT = port;
});

test("does not expose the unused link preview proxy", async () => {
	const response = await fetch(
		new URL("/api/link-preview?url=https://example.com", server.url),
	);

	expect(response.status).toBe(404);
});

test("returns a real 404 response for missing pages", async () => {
	const response = await fetch(new URL("/missing", server.url));

	expect(response.status).toBe(404);
	expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
});

test("production build processes Tailwind and injects shared HTML", async () => {
	const outputDirectory = await mkdtemp(join(tmpdir(), "abyrd-website-"));
	let productionServer: ReturnType<typeof Bun.spawn> | undefined;

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
		const stylesheetPath = homepage.match(
			/<link rel="stylesheet"[^>]*href="([^"]+\.css)">/,
		)?.[1];

		if (!stylesheetPath)
			throw new Error("Production homepage has no stylesheet.");

		const stylesheet = await Bun.file(
			join(outputDirectory, stylesheetPath.replace(/^\.\//, "")),
		).text();

		expect(stylesheet).toContain(".min-h-dvh");
		expect(homepage).toContain('id="nav-logo"');

		productionServer = Bun.spawn({
			cmd: ["bun", "index.js"],
			cwd: outputDirectory,
			env: { ...process.env, NODE_ENV: "production", PORT: "0" },
			stderr: "pipe",
			stdout: "pipe",
		});

		const serverOutput = productionServer.stdout;

		if (!serverOutput || typeof serverOutput === "number") {
			throw new Error(
				"Production server did not expose a readable output stream.",
			);
		}

		const serverUrl = await _readServerUrl(serverOutput);
		const stylesheetResponse = await fetch(new URL(stylesheetPath, serverUrl));

		expect(stylesheetResponse.status).toBe(200);
		expect(stylesheetResponse.headers.get("Content-Type")).toContain(
			"text/css",
		);

		const unregisteredAsset = await fetch(new URL("/index.css", serverUrl));

		expect(unregisteredAsset.status).toBe(200);
		expect(unregisteredAsset.headers.get("Content-Type")).toContain("text/css");
	} finally {
		if (productionServer) {
			productionServer.kill();
			await productionServer.exited;
		}

		await rm(outputDirectory, { force: true, recursive: true });
	}
});

test("crawl routes support HEAD requests", async () => {
	for (const path of ["/robots.txt", "/sitemap.xml"]) {
		const response = await fetch(new URL(path, server.url), { method: "HEAD" });

		expect(response.status).toBe(200);
	}
});

test("includes the resume in the sitemap", async () => {
	const response = await fetch(new URL("/sitemap.xml", server.url));

	expect(await response.text()).toContain(
		`<loc>${server.url.origin}/resume</loc>`,
	);
});

async function _readServerUrl(output: ReadableStream<Uint8Array>) {
	const decoder = new TextDecoder();
	const reader = output.getReader();
	let text = "";

	while (true) {
		const chunk = await reader.read();

		if (chunk.done)
			throw new Error(`Production server stopped before it started: ${text}`);

		text += decoder.decode(chunk.value, { stream: true });

		const url = text.match(/Server running at (http:\/\/localhost:\d+\/)/)?.[1];

		if (url) return new URL(url);
	}
}
