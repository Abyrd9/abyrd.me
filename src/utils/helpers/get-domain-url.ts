export function getDomainUrl(request: Request) {
	if (process.env.NODE_ENV === "production") return "https://abyrd.me";
	return new URL(request.url).origin;
}
