import { createFileRoute } from "@tanstack/react-router";
import { serveWritingImage } from "#/server/writing-images-routes";

export const Route = createFileRoute("/api/writing-images/$name")({
	server: {
		handlers: {
			GET: ({ request, params }) => serveWritingImage(request, params.name),
		},
	},
});
