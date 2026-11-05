import { secrets } from "bun";

const token = await secrets.get({
	service:
		process.argv[2] === "production"
			? "me.abyrd.kindle-mcp.production"
			: "me.abyrd.kindle-mcp.local",
	name: "token",
});
if (!token) throw new Error("Kindle MCP token not found in Keychain.");
console.log(JSON.stringify({ Authorization: `Bearer ${token}` }));
