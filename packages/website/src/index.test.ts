import { afterAll, expect, test } from "bun:test";

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
