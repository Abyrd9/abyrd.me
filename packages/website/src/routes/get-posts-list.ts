import { getPosts } from "../utils/get-posts";

export async function getPostsList(req: Request) {
	try {
		const posts = await getPosts();

		const url = new URL(req.url);
		const bustCache = url.searchParams.has("bust");
		const isDev = process.env.NODE_ENV !== "production";

		const cacheControl =
			bustCache || isDev ? "no-store" : "public, max-age=300"; // Cache for 5 minutes in production

		return Response.json(posts, {
			headers: {
				"Cache-Control": cacheControl,
			},
		});
	} catch (error) {
		console.error("Error fetching posts:", error);
		return Response.json({ error: "Failed to fetch posts" }, { status: 500 });
	}
}
