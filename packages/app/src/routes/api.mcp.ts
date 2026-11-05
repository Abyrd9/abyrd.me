import { createFileRoute } from "@tanstack/react-router";
import { handleKindleMcp } from "#/server/kindle-mcp";

export const Route = createFileRoute("/api/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => handleKindleMcp(request),
			POST: ({ request }) => handleKindleMcp(request),
			DELETE: ({ request }) => handleKindleMcp(request),
		},
	},
});
