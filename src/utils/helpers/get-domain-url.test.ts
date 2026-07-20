import { describe, expect, test } from "bun:test";
import { getDomainUrl } from "./get-domain-url";

describe("getDomainUrl", () => {
	test("uses the canonical production origin", () => {
		const nodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		const request = new Request("http://127.0.0.1/sitemap.xml", {
			headers: {
				"X-Forwarded-Host": "attacker.example",
				"X-Forwarded-Proto": "https",
			},
		});

		try {
			expect(getDomainUrl(request)).toBe("https://abyrd.me");
		} finally {
			if (nodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = nodeEnv;
		}
	});

	test("keeps localhost requests on http", () => {
		const request = new Request("http://localhost:3000/sitemap.xml");

		expect(getDomainUrl(request)).toBe("http://localhost:3000");
	});
});
