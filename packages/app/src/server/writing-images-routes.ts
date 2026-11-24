import { Effect } from "effect";
import { hasValidSession } from "./auth";
import { loadDatabaseConfig } from "./database/config";
import { imageDirectory, readImage, saveImage } from "./writing-images";

const signedInDirectory = (request: Request) =>
	Effect.runPromise(
		Effect.gen(function* () {
			const signedIn = yield* hasValidSession(request.headers.get("cookie"));
			if (!signedIn) return null;
			const { databasePath } = yield* loadDatabaseConfig;
			return imageDirectory(databasePath);
		}).pipe(Effect.orDie),
	);

/** Accepts one image as the "image" field of a multipart form. */
export async function uploadWritingImage(request: Request) {
	const directory = await signedInDirectory(request);
	if (!directory)
		return Response.json({ error: "Sign in first." }, { status: 401 });

	const form = await request.formData().catch(() => null);
	const image = form?.get("image");
	if (!(image instanceof File))
		return Response.json(
			{ error: "Choose an image to upload." },
			{ status: 400 },
		);

	const saved = await saveImage(directory, image);
	if (!saved.ok) return Response.json({ error: saved.reason }, { status: 400 });
	return Response.json({ url: `/api/writing-images/${saved.name}` });
}

export async function serveWritingImage(request: Request, name: string) {
	const directory = await signedInDirectory(request);
	if (!directory) return new Response("Unauthorized", { status: 401 });

	const image = await readImage(directory, name);
	if (!image) return new Response("Not found", { status: 404 });
	return new Response(image.bytes, {
		headers: {
			"Content-Type": image.contentType,
			// Names are random and never reused, so the bytes never change.
			"Cache-Control": "private, max-age=31536000, immutable",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
