import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_IMAGE_BYTES, readImage, saveImage } from "./writing-images";

const file = (type: string, bytes: Uint8Array, size = bytes.length) => ({
	type,
	size,
	arrayBuffer: async () => bytes.slice().buffer,
});

test("stores images under generated names and reads them back", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-images-"));
	try {
		const bytes = new Uint8Array([137, 80, 78, 71]);
		const saved = await saveImage(directory, file("image/png", bytes));
		if (!saved.ok) throw new Error(saved.reason);

		expect(saved.name).toMatch(/^[0-9a-f-]{36}\.png$/);
		const read = await readImage(directory, saved.name);
		expect(read?.contentType).toBe("image/png");
		expect([...(read?.bytes ?? [])]).toEqual([...bytes]);
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});

test("rejects unsupported, oversized, and unsafe images", async () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-images-"));
	try {
		const svg = await saveImage(
			directory,
			file("image/svg+xml", new Uint8Array(1)),
		);
		expect(svg.ok).toBe(false);
		const huge = await saveImage(
			directory,
			file("image/jpeg", new Uint8Array(1), MAX_IMAGE_BYTES + 1),
		);
		expect(huge.ok).toBe(false);

		expect(await readImage(directory, "../app.sqlite")).toBeNull();
		expect(
			await readImage(directory, "00000000-0000-0000-0000-000000000000.png"),
		).toBeNull();
	} finally {
		rmSync(directory, { force: true, recursive: true });
	}
});
