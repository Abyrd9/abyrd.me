import { useState } from "react";
import { z } from "zod";

const searchResult = z.object({
	docs: z.array(
		z.object({
			key: z.string().regex(/^\/works\/OL\d+W$/),
			title: z.string(),
			author_name: z.array(z.string()).optional(),
		}),
	),
});
const workResult = z.object({
	description: z
		.union([z.string(), z.object({ value: z.string() })])
		.optional(),
});
const normalize = (value: string) =>
	value
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

export function BookDescription({
	title,
	author,
}: {
	title: string;
	author: string;
}) {
	const [description, setDescription] = useState<string | null>(null);
	const [source, setSource] = useState<string | null>(null);
	const [status, setStatus] = useState<
		"idle" | "loading" | "missing" | "error"
	>("idle");

	async function load() {
		setStatus("loading");
		try {
			const query = new URLSearchParams({
				title: title.split(":")[0],
				author,
				fields: "key,title,author_name",
				limit: "20",
			});
			const response = await fetch(
				`https://openlibrary.org/search.json?${query}`,
				{ signal: AbortSignal.timeout(10000) },
			);
			if (!response.ok) throw new Error("Search failed");
			const result = searchResult.parse(await response.json());
			const matches = result.docs.filter(
				(book) =>
					normalize(book.title) === normalize(title.split(":")[0]) &&
					book.author_name?.some(
						(name) => normalize(name) === normalize(author),
					),
			);
			if (matches.length !== 1) {
				setStatus("missing");
				return;
			}
			const work = await fetch(
				`https://openlibrary.org${matches[0].key}.json`,
				{ signal: AbortSignal.timeout(10000) },
			);
			if (!work.ok) throw new Error("Lookup failed");
			const data = workResult.parse(await work.json());
			const text =
				typeof data.description === "string"
					? data.description
					: data.description?.value;
			if (!text?.trim()) {
				setStatus("missing");
				return;
			}
			setDescription(text.trim());
			setSource(`https://openlibrary.org${matches[0].key}`);
			setStatus("idle");
		} catch {
			setStatus("error");
		}
	}

	return (
		<div className="mt-3 text-sm text-slate-600">
			{description ? (
				<>
					<p className="whitespace-pre-line leading-6">{description}</p>
					<a
						className="mt-2 inline-block underline"
						href={source ?? "https://openlibrary.org"}
						target="_blank"
						rel="noreferrer"
					>
						Description from Open Library
					</a>
				</>
			) : (
				<button
					className="underline"
					type="button"
					disabled={status === "loading"}
					onClick={() => void load()}
				>
					{status === "loading"
						? "Looking up description…"
						: status === "error"
							? "Could not load description. Try again"
							: status === "missing"
								? "No reliable description found. Try again"
								: "Find book description"}
				</button>
			)}
		</div>
	);
}
