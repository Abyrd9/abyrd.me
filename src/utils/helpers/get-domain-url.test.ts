import { describe, expect, test } from "bun:test";
import { getDomainUrl } from "./get-domain-url";

describe("getDomainUrl", () => {
	test("uses forwarded host and proto when present", () => {
		const request = new Request("http://127.0.0.1/sitemap.xml", {
			headers: {
				"X-Forwarded-Host": "abyrd.me",
				"X-Forwarded-Proto": "https",
			},
		});

		expect(getDomainUrl(request)).toBe("https://abyrd.me");
	});

	test("uses the first forwarded host when proxies append more than one", () => {
		const request = new Request("http://127.0.0.1/sitemap.xml", {
			headers: {
				"X-Forwarded-Host": "abyrd.me, proxy.internal",
				"X-Forwarded-Proto": "https, http",
			},
		});

		expect(getDomainUrl(request)).toBe("https://abyrd.me");
	});

	test("keeps localhost requests on http", () => {
		const request = new Request("http://localhost:3000/sitemap.xml");

		expect(getDomainUrl(request)).toBe("http://localhost:3000");
	});
});
