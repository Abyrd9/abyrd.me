import { createFileRoute } from "@tanstack/react-router";
import { uploadWritingImage } from "#/server/writing-images-routes";

export const Route = createFileRoute("/api/writing-images")({
	server: {
		handlers: {
			POST: ({ request }) => uploadWritingImage(request),
		},
	},
});
