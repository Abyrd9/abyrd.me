import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "#/components/primitives/button";
import { Field } from "#/components/primitives/field";
import {
	addVocabularyWord,
	editVocabularyEntry,
	listVocabulary,
} from "#/server/vocabulary-functions";

type Entry = Awaited<ReturnType<typeof listVocabulary>>[number];

const Dictionary = () => {
	const entries = Route.useLoaderData();
	const router = useRouter();
	const [selected, setSelected] = useState("");
	const [word, setWord] = useState("");
	const [isLookingUp, setIsLookingUp] = useState(false);
	const [error, setError] = useState("");
	const entry = entries.find((item) => item.word === selected) ?? entries[0];

	async function lookup(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isLookingUp) return;
		setError("");
		if (!/^\p{L}[\p{L}\p{M}'’ -]*$/u.test(word.trim())) {
			setError("Enter a word or short phrase using letters.");
			return;
		}

		setIsLookingUp(true);
		try {
			const saved = await addVocabularyWord({ data: word });
			await router.invalidate({ sync: true });
			setSelected(saved);
			setWord("");
		} catch {
			setError("Could not save that word. Please try again.");
		} finally {
			setIsLookingUp(false);
		}
	}

	return (
		<section className="w-full max-w-3xl py-8 sm:py-14">
			<h1 className="text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
				Dictionary
			</h1>
			<p className="mt-4 text-slate-600">
				Save words you come across and see how they work in a sentence.
			</p>
			<form className="mt-6 max-w-xl" onSubmit={lookup}>
				<Field.Root>
					<Field.Label>Word or phrase</Field.Label>
					<div className="flex flex-wrap items-center gap-2">
						<Field.Control
							autoComplete="off"
							className="min-w-36 flex-1"
							maxLength={80}
							onChange={(event) => setWord(event.target.value)}
							required
							value={word}
						/>
						<Button className="min-h-11" disabled={isLookingUp} type="submit">
							{isLookingUp ? "Looking up…" : "Look up & save"}
						</Button>
					</div>
				</Field.Root>
				{error && (
					<p className="mt-2 text-sm text-red-700" role="alert">
						{error}
					</p>
				)}
			</form>

			<div className="mt-9 grid min-w-0 gap-6 border-t border-slate-200 pt-6 sm:grid-cols-[10rem_minmax(0,1fr)]">
				<aside aria-label="Saved words">
					<h2 className="mb-2 text-sm font-medium text-slate-700">
						Saved words
					</h2>
					<ul className="flex max-h-72 flex-wrap gap-1 overflow-auto sm:block">
						{entries.map(({ word }) => (
							<li key={word} className="min-w-0">
								<button
									aria-pressed={entry?.word === word}
									className="min-h-10 w-full rounded-md px-3 text-left text-sm text-slate-700 [overflow-wrap:anywhere] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] aria-pressed:bg-slate-100 aria-pressed:font-semibold aria-pressed:text-slate-950"
									onClick={() => setSelected(word)}
									type="button"
								>
									{word}
								</button>
							</li>
						))}
					</ul>
				</aside>
				{entry ? (
					<DictionaryEntry key={entry.word} entry={entry} />
				) : (
					<p className="text-slate-600">
						Look up a word to start your dictionary.
					</p>
				)}
			</div>
		</section>
	);
};

const DictionaryEntry = ({ entry }: { entry: Entry }) => {
	const router = useRouter();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isSaving) return;
		setError("");
		const form = new FormData(event.currentTarget);
		const definition = String(form.get("definition") ?? "");
		const examples = String(form.get("examples") ?? "")
			.split(/\r?\n/)
			.map((sentence) => sentence.trim())
			.filter(Boolean);
		if (
			examples.length > 20 ||
			examples.some((sentence) => sentence.length > 300)
		) {
			setError("Use up to 20 sentences, each at most 300 characters.");
			return;
		}

		setIsSaving(true);
		try {
			const saved = await editVocabularyEntry({
				data: { word: entry.word, definition, examples },
			});
			if (!saved) throw new Error("Entry no longer exists");
			await router.invalidate({ sync: true });
			setIsEditing(false);
		} catch {
			setError("Could not save your changes. Please try again.");
		} finally {
			setIsSaving(false);
		}
	}

	const textarea =
		"w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:outline-2 focus:outline-slate-500";

	return (
		<article
			className="min-w-0 [overflow-wrap:anywhere]"
			aria-labelledby="dictionary-word"
		>
			<h2 className="text-2xl font-medium text-slate-950" id="dictionary-word">
				{entry.word}
			</h2>
			{isEditing ? (
				<form className="mt-4 grid gap-4" onSubmit={save}>
					<label className="grid gap-1.5 text-sm font-medium text-slate-700">
						Definition
						<textarea
							className={textarea}
							defaultValue={entry.definition}
							maxLength={1500}
							name="definition"
							rows={3}
						/>
					</label>
					<label className="grid gap-1.5 text-sm font-medium text-slate-700">
						Example sentences (one per line)
						<textarea
							className={textarea}
							defaultValue={entry.examples.join("\n")}
							name="examples"
							rows={5}
						/>
					</label>
					{error && (
						<p className="text-sm text-red-700" role="alert">
							{error}
						</p>
					)}
					<div className="flex gap-2">
						<Button disabled={isSaving} type="submit">
							{isSaving ? "Saving…" : "Save changes"}
						</Button>
						<Button
							disabled={isSaving}
							onClick={() => {
								setError("");
								setIsEditing(false);
							}}
							type="button"
						>
							Cancel
						</Button>
					</div>
				</form>
			) : (
				<>
					<p className="mt-3 whitespace-pre-line leading-7 text-slate-700">
						{entry.definition ||
							"No definition found. You can add one in your own words."}
					</p>
					<h3 className="mt-6 font-medium text-slate-950">Example sentences</h3>
					{entry.examples.length ? (
						<ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-slate-700">
							{entry.examples.map((sentence) => (
								<li key={sentence}>{sentence}</li>
							))}
						</ul>
					) : (
						<p className="mt-2 text-slate-600">
							No examples found. Add a sentence that helps you remember it.
						</p>
					)}
					<div className="mt-5 flex flex-wrap items-center gap-4">
						<Button onClick={() => setIsEditing(true)} type="button">
							Edit definition & examples
						</Button>
						{entry.sourceUrl && (
							<a
								className="text-sm text-slate-600 underline"
								href={entry.sourceUrl}
							>
								Wiktionary entry
							</a>
						)}
					</div>
				</>
			)}
		</article>
	);
};

export const Route = createFileRoute("/_authenticated/dictionary")({
	head: () => ({ meta: [{ title: "Dictionary · abyrd.me" }] }),
	loader: () => listVocabulary(),
	component: Dictionary,
});
