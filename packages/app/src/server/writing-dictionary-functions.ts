import { createServerFn } from "@tanstack/react-start";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { dictionaryWords } from "./database/schema";
import { runSignedIn } from "./signed-in";

/** Every word added to the spell checker's dictionary. */
export const listDictionaryWords = createServerFn({ method: "GET" }).handler(
	() =>
		runSignedIn((db) =>
			db
				.select({ word: dictionaryWords.word })
				.from(dictionaryWords)
				.orderBy(asc(dictionaryWords.word))
				.all()
				.map((row) => row.word),
		),
);

export const addDictionaryWord = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z.object({ word: z.string().trim().min(1).max(100) }).parse(input),
	)
	.handler(({ data }) =>
		runSignedIn((db) => {
			db.insert(dictionaryWords)
				.values({ word: data.word, createdAt: Date.now() })
				.onConflictDoNothing()
				.run();
		}),
	);
