import { expect, test } from "bun:test";
import { getPosts } from "./get-posts";

test("getPosts returns newest posts first with tag metadata", async () => {
	const posts = await getPosts();

	expect(posts.length).toBeGreaterThan(0);
	expect(posts[0]?.slug).toBe("2026-02-08-the-old-internet-isnt-dead-yet");

	const avatarAnimalsPost = posts.find(
		(post) => post.slug === "2026-02-08-the-old-internet-isnt-dead-yet",
	);

	expect(avatarAnimalsPost).toMatchObject({
		path: "/posts/2026-02-08-the-old-internet-isnt-dead-yet",
		tags: ["AI", "web development"],
	});
});
