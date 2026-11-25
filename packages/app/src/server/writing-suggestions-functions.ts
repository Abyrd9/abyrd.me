import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSignedIn } from "./signed-in";
import { listSuggestions, resolveSuggestion } from "./writing-suggestions";

const id = z.number().int().positive();

export const listChapterSuggestions = createServerFn({ method: "GET" })
	.validator((input: unknown) => z.object({ chapterId: id }).parse(input))
	.handler(({ data }) =>
		runSignedIn((db) => listSuggestions(db, { ...data, status: "pending" })),
	);

export const resolveChapterSuggestion = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.discriminatedUnion("status", [
				z.object({
					id,
					status: z.literal("accepted"),
					index: z.number().int().min(0),
				}),
				z.object({ id, status: z.literal("declined") }),
			])
			.parse(input),
	)
	.handler(({ data: { id, ...outcome } }) =>
		runSignedIn((db) => resolveSuggestion(db, id, outcome)),
	);
