import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const extensions = new Map([
	["image/png", "png"],
	["image/jpeg", "jpg"],
	["image/webp", "webp"],
	["image/gif", "gif"],
]);

const contentTypes = new Map(
	[...extensions].map(([type, extension]) => [extension, type]),
);

// Stored names are generated here, so anything else is rejected before it can
// reach the file system.
const storedName = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;

/** Images live beside the database so they share its persistent volume. */
export const imageDirectory = (databasePath: string) =>
	join(dirname(databasePath), "writing-images");

export type SavedImage =
	| { ok: true; name: string }
	| { ok: false; reason: string };

export async function saveImage(
	directory: string,
	file: { type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
): Promise<SavedImage> {
	const extension = extensions.get(file.type);
	if (!extension)
		return { ok: false, reason: "Use a PNG, JPEG, WebP, or GIF image." };
	if (file.size > MAX_IMAGE_BYTES)
		return { ok: false, reason: "Images must be 10 MB or smaller." };

	const name = `${randomUUID()}.${extension}`;
	await mkdir(directory, { recursive: true });
	await writeFile(
		join(directory, name),
		new Uint8Array(await file.arrayBuffer()),
	);
	return { ok: true, name };
}

export async function readImage(directory: string, name: string) {
	if (!storedName.test(name)) return null;
	try {
		const bytes = await readFile(join(directory, name));
		return { bytes, contentType: contentTypes.get(name.split(".")[1]) ?? "" };
	} catch {
		return null;
	}
}
