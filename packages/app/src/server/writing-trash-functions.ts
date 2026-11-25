import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSignedIn } from "./signed-in";
import { deleteTrashItem, listTrash, restoreTrashItem } from "./writing-trash";

const input = (value: unknown) =>
	z.object({ id: z.number().int().positive() }).parse(value);

export const listWritingTrash = createServerFn({ method: "GET" }).handler(() =>
	runSignedIn((db) => listTrash(db)),
);
export const restoreWritingTrash = createServerFn({ method: "POST" })
	.validator(input)
	.handler(({ data }) => runSignedIn((db) => restoreTrashItem(db, data.id)));
export const deleteWritingTrash = createServerFn({ method: "POST" })
	.validator(input)
	.handler(({ data }) => runSignedIn((db) => deleteTrashItem(db, data.id)));
