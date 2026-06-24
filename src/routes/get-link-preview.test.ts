import { afterEach, describe, expect, test } from "bun:test";
import { getLinkPreview } from "./get-link-preview";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("getLinkPreview", () => {
	test("rejects non-http urls", async () => {
		const response = await getLinkPreview(
			new Request(
				"http://localhost/api/link-preview?url=ftp://example.com/image.png",
			),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "URL must use http or https",
		});
	});

	test("rejects localhost and private network urls", async () => {
		for (const url of [
			"http://localhost:3000/private",
			"http://127.0.0.1/private",
			"http://192.168.1.10/private",
			"http://[::1]/private",
		]) {
			const response = await getLinkPreview(
				new Request(
					`http://localhost/api/link-preview?url=${encodeURIComponent(url)}`,
				),
			);

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({
				error: "URL must not target localhost or a private network",
			});
		}
	});

	test("returns preview metadata for valid urls", async () => {
		const fetchMock: typeof fetch = Object.assign(
			async (
				_input: Parameters<typeof fetch>[0],
				init?: Parameters<typeof fetch>[1],
			) => {
				expect(init?.headers).toEqual({
					"User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
				});

				return new Response(
					`<!doctype html>
					<html>
						<head>
							<meta property="og:title" content="Preview title" />
							<meta property="og:description" content="Preview description" />
							<meta property="og:image" content="https://example.com/cover.png" />
						</head>
					</html>`,
				);
			},
			{ preconnect: originalFetch.preconnect.bind(originalFetch) },
		);

		globalThis.fetch = fetchMock;

		const response = await getLinkPreview(
			new Request(
				"http://localhost/api/link-preview?url=https://example.com/article",
			),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			title: "Preview title",
			description: "Preview description",
			image: "https://example.com/cover.png",
			domain: "example.com",
			url: "https://example.com/article",
		});
	});
});
