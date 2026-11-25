import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSignedIn } from "./signed-in";
import { lookUpWord } from "./word-lookup";

export const lookUpWritingWord = createServerFn({ method: "GET" })
	.validator((input: unknown) =>
		z
			.object({
				word: z
					.string()
					.trim()
					.max(60)
					.regex(/^\p{L}[\p{L}'’-]*$/u),
			})
			.parse(input),
	)
	.handler(({ data }) => runSignedIn((db) => lookUpWord(db, data.word)));
