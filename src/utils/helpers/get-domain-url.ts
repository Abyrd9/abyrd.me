export function getDomainUrl(request: Request) {
	const host =
		request.headers.get("X-Forwarded-Host")?.split(",")[0]?.trim() ??
		request.headers.get("host") ??
		new URL(request.url).host;

	const protocol =
		request.headers.get("X-Forwarded-Proto")?.split(",")[0]?.trim() ||
		(host.includes("localhost") ? "http" : "https");

	return `${protocol}://${host}`;
}
