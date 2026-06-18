import { describe, expect, test } from "bun:test";
import { getPosts } from "./get-posts";

describe("getPosts", () => {
	test("returns newest posts first", async () => {
		const posts = await getPosts();

		expect(posts.map((post) => post.slug)).toEqual([
			"2026-02-08-the-old-internet-isnt-dead-yet",
			"2025-12-18-on-intellectual-humility",
			"2025-12-10-hello-world",
		]);
	});

	test("collects repeated article tags", async () => {
		const posts = await getPosts();
		const post = posts.find(
			(item) => item.slug === "2026-02-08-the-old-internet-isnt-dead-yet",
		);

		expect(post?.tag).toBe("AI");
		expect(post?.tags).toEqual(["AI", "web development"]);
	});
});
