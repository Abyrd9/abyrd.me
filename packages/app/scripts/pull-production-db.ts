import { Database } from "bun:sqlite";
import { mkdir, open, unlink } from "node:fs/promises";

// VACUUM INTO includes committed WAL data and leaves the live database untouched.
const remote = `
const { Database } = require("bun:sqlite");
const { readFileSync, unlinkSync } = require("node:fs");
const path = process.env.APP_DATABASE_PATH;
if (!path) throw new Error("APP_DATABASE_PATH is not set");
const snapshot = "/tmp/abyrd-snapshot-" + crypto.randomUUID() + ".sqlite";
const db = new Database(path, { readonly: true });
try {
  db.run("VACUUM INTO '" + snapshot + "'");
  process.stdout.write(readFileSync(snapshot));
} finally {
  db.close();
  try { unlinkSync(snapshot); } catch {}
}
`;

const result = Bun.spawnSync(
	[
		"railway",
		"ssh",
		"--project",
		"8a0ee622-d6db-462c-9f6d-35d9652f91e4",
		"--service",
		"app",
		"--environment",
		"production",
		"--",
		"bun",
		"-e",
		remote,
	],
	{
		stdin: "ignore",
		stderr: "inherit",
		env: {
			...process.env,
			RAILWAY_CALLER: "skill:use-railway@1.2.2",
			RAILWAY_AGENT_SESSION: `abyrd-db-snapshot-${Date.now()}`,
		},
	},
);
if (!result.success)
	throw new Error("Railway snapshot failed; no local file was saved.");
if (!result.stdout.subarray(0, 16).equals(Buffer.from("SQLite format 3\0"))) {
	throw new Error(
		"Railway did not return a SQLite database; no local file was saved.",
	);
}

await mkdir("./data", { recursive: true });
const path = `./data/production-${new Date().toISOString().replaceAll(":", "-")}.sqlite`;
const file = await open(path, "wx", 0o600);
try {
	await file.writeFile(result.stdout);
	await file.close();
	const db = new Database(path, { readonly: true });
	try {
		const result = db
			.query<{ integrity_check: string }, []>("PRAGMA integrity_check")
			.get();
		if (result?.integrity_check !== "ok")
			throw new Error("Snapshot failed integrity check");
	} finally {
		db.close();
	}
} catch (error) {
	await file.close().catch(() => {});
	await unlink(path).catch(() => {});
	throw error;
}
console.log(`Saved production snapshot to ${path}`);
