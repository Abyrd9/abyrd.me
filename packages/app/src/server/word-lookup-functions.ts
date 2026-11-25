import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSignedIn } from "./signed-in";
import { lookUpWord } from "./word-lookup";

export const lookUpWritingWord = createServerFn({ method: "GET" })
	.validator((input: unknown) =>
		z
			.object({
				// Origins link to words in other languages and scripts, with
				// accents, combining marks, and spaces.
				word: z
					.string()
					.trim()
					.max(80)
					.regex(/^\p{L}[\p{L}\p{M}'’ -]*$/u),
				language: z
					.string()
					.max(60)
					.regex(/^[\p{L} '’-]+$/u)
					.default("English"),
			})
			.parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => lookUpWord(db, data.word, data.language)),
	);
