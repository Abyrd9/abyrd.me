import { createContext, type ReactNode, useEffect, useState } from "react";
import type { OriginPart, WordEntry } from "#/server/word-lookup";
import { lookUpWritingWord } from "#/server/word-lookup-functions";

/**
 * Opens the word panel beside the page. Editors outside the writing page have
 * no panel, so the toolbar hides its Define button there.
 */
export const WordLookupContext = createContext<((word: string) => void) | null>(
	null,
);

/** A single word, as the dictionary lookup accepts it. */
export const asLookupWord = (text: string) => {
	const word = text.trim().replace(/['’]s$/, "");
	return word.length <= 60 && /^\p{L}[\p{L}'’-]*$/u.test(word) ? word : null;
};

type Lookup = { word: string; language: string };
type Open = (word: string, language: string) => void;

/**
 * A dictionary entry in the notes column: meanings, the word in use, origin,
 * and similar words. Similar words and the words in an origin open in place,
 * with a way back.
 */
export const WordPanel = ({
	word,
}: {
	/** The word to open with, or null to start from the search box. */
	word: string | null;
}) => {
	const [trail, setTrail] = useState<Lookup[]>(
		word ? [{ word, language: "English" }] : [],
	);
	const current = trail.at(-1);
	const [query, setQuery] = useState("");
	const [invalid, setInvalid] = useState(false);
	const previous = trail.length > 1 ? trail[trail.length - 2] : null;
	const [entry, setEntry] = useState<WordEntry | null | undefined>(undefined);

	useEffect(() => {
		if (!current) return;
		let active = true;
		setEntry(undefined);
		lookUpWritingWord({ data: current })
			.then((found) => active && setEntry(found))
			.catch(() => active && setEntry(null));
		return () => {
			active = false;
		};
	}, [current]);

	const open: Open = (next, language) =>
		setTrail((words) => [...words, { word: next, language }]);
	const rail =
		"inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100";

	return (
		<section
			aria-label={current ? `Dictionary: ${current.word}` : "Dictionary"}
			// The paper fits its entry, scrolling only once it reaches the bottom.
			className="flex h-full items-start max-sm:flex-col-reverse max-sm:items-stretch"
		>
			<div className="max-h-full min-h-0 min-w-0 overflow-y-auto bg-white px-6 pt-6 pb-12 font-book text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:flex-1 sm:px-10">
				<form
					className="mb-8 font-sans"
					onSubmit={(event) => {
						event.preventDefault();
						const next = asLookupWord(query);
						setInvalid(!next);
						if (!next) return;
						setQuery("");
						open(next, "English");
					}}
				>
					<input
						aria-invalid={invalid}
						aria-label="Look up a word"
						className="w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400 focus:bg-white"
						onChange={(event) => {
							setQuery(event.target.value);
							setInvalid(false);
						}}
						placeholder={
							invalid ? "One word, letters only" : "Look up a word, then Enter"
						}
						value={query}
					/>
				</form>
				{!current ? (
					<p className="text-stone-500">
						Search for a word above, or select one in your writing and press the
						book button.
					</p>
				) : entry === undefined ? (
					<p className="text-stone-400">Looking up “{current.word}”…</p>
				) : entry === null ? (
					<p className="text-stone-500">
						Couldn’t reach the dictionary. Check your connection and try again.
					</p>
				) : (
					<Entry entry={entry} onOpen={open} />
				)}
			</div>
			{previous ? (
				<aside
					aria-label="Dictionary controls"
					className="flex shrink-0 gap-3 text-xs text-stone-500 max-sm:items-center max-sm:px-3 max-sm:py-2 sm:w-36 sm:flex-col sm:items-start sm:pl-4"
				>
					<button
						className={rail}
						onClick={() => setTrail((words) => words.slice(0, -1))}
						type="button"
					>
						‹ {previous.word}
					</button>
				</aside>
			) : null}
		</section>
	);
};

const Entry = ({ entry, onOpen }: { entry: WordEntry; onOpen: Open }) => {
	const english = entry.language === "English";
	const found =
		entry.meanings.length ||
		entry.root?.meanings.length ||
		entry.origins.length;
	const highlight = [entry.word, entry.root?.word].filter(
		(word): word is string => Boolean(word),
	);
	return (
		<article className="text-[15px] leading-relaxed">
			<header className="mb-6">
				{english ? null : (
					<p className="mb-1 font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
						{entry.language}
					</p>
				)}
				<h2 className="font-book text-3xl text-stone-950">{entry.word}</h2>
				{entry.pronunciation ? (
					<p className="mt-1 text-stone-500">{entry.pronunciation}</p>
				) : null}
			</header>

			{found ? null : (
				<p className="mb-6 text-stone-500">
					{english
						? `No dictionary entry for “${entry.word}”.`
						: `Wiktionary has no ${entry.language} entry for “${entry.word}”.`}
				</p>
			)}

			<Meanings meanings={entry.meanings} />

			{entry.examples.length || entry.relatedExamples.length ? (
				<Section title="In use">
					<ul className="grid gap-2">
						{entry.examples.map((example) => (
							<li className="text-stone-700" key={example}>
								<Marked text={example} words={highlight} />
							</li>
						))}
					</ul>
					{entry.relatedExamples.length ? (
						<>
							<p className="mt-3 mb-1.5 font-sans text-xs text-stone-500">
								{entry.examples.length
									? "Related forms in use:"
									: `No sentences use “${entry.word}” itself. Related forms in use:`}
							</p>
							<ul className="grid gap-2">
								{entry.relatedExamples.map((example) => (
									<li className="text-stone-700" key={example}>
										{example}
									</li>
								))}
							</ul>
						</>
					) : null}
				</Section>
			) : null}

			{entry.origins.length ? (
				<Origins onOpen={onOpen} origins={entry.origins} />
			) : null}

			{entry.root ? (
				<div className="mt-8 border-t border-stone-200 pt-6">
					<button
						className="font-book text-2xl text-stone-950 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-600"
						onClick={() => onOpen(entry.root?.word ?? "", entry.language)}
						type="button"
					>
						{entry.root.word}
					</button>
					<div className="mt-4">
						<Meanings meanings={entry.root.meanings} />
						{entry.root.origins.length ? (
							<Origins onOpen={onOpen} origins={entry.root.origins} />
						) : null}
					</div>
				</div>
			) : null}

			{entry.similar.length ? (
				<Section title="Similar words">
					<div className="flex flex-wrap gap-1.5">
						{entry.similar.map((word) => (
							<button
								className="rounded-full border border-stone-200 px-2.5 py-0.5 text-sm text-stone-700 hover:border-stone-400 hover:text-stone-950"
								key={word}
								onClick={() => onOpen(word, "English")}
								type="button"
							>
								{word}
							</button>
						))}
					</div>
				</Section>
			) : null}

			{entry.fromLibrary.length ? (
				<Section title="From your library">
					<ul className="grid gap-4">
						{entry.fromLibrary.map((passage) => (
							<li key={passage.text}>
								<blockquote className="border-l-2 border-stone-200 pl-3 text-stone-700 italic">
									<Marked text={passage.text} words={highlight} />
								</blockquote>
								{passage.source ? (
									<p className="mt-1 pl-3 font-sans text-xs text-stone-500">
										{passage.source}
									</p>
								) : null}
							</li>
						))}
					</ul>
				</Section>
			) : null}

			<footer className="mt-10 font-sans text-[11px] leading-normal text-stone-400">
				Meanings and origin from{" "}
				{entry.wiktionaryUrl ? (
					<a
						className="underline hover:text-stone-600"
						href={entry.wiktionaryUrl}
						rel="noreferrer"
						target="_blank"
					>
						Wiktionary
					</a>
				) : (
					"Wiktionary"
				)}{" "}
				(CC BY-SA).
				{english
					? " Sentences from Tatoeba (CC BY) and the Free Dictionary API. Similar words from Datamuse."
					: null}
			</footer>
		</article>
	);
};

const Meanings = ({ meanings }: { meanings: WordEntry["meanings"] }) =>
	meanings.map((meaning, index) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: a word can have two noun entries.
		<div className="mb-5" key={index}>
			<p className="mb-1 text-sm text-stone-500 italic">
				{meaning.partOfSpeech.toLowerCase()}
			</p>
			<ol className="grid list-decimal gap-1.5 pl-5 marker:text-sm marker:text-stone-400">
				{meaning.senses.map((sense) => (
					<li key={sense.text}>
						{sense.text}
						{sense.examples.map((example) => (
							<p className="mt-0.5 text-stone-500 italic" key={example}>
								{example}
							</p>
						))}
					</li>
				))}
			</ol>
		</div>
	));

/** Each origin, with the words it names opening their own entries. */
const Origins = ({
	origins,
	onOpen,
}: {
	origins: OriginPart[][];
	onOpen: Open;
}) => (
	<Section title="Origin">
		<div className="grid gap-2 text-stone-700">
			{origins.map((parts, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: origins are positional.
				<p key={index}>
					{parts.map((part, at) =>
						part.link ? (
							<button
								className="text-stone-950 underline decoration-stone-300 decoration-dotted underline-offset-[3px] hover:decoration-stone-700"
								// biome-ignore lint/suspicious/noArrayIndexKey: parts are positional.
								key={at}
								onClick={() =>
									part.link && onOpen(part.link.word, part.link.language)
								}
								title={`Look up ${part.link.language} “${part.link.word}”`}
								type="button"
							>
								{part.text}
							</button>
						) : (
							part.text
						),
					)}
				</p>
			))}
		</div>
	</Section>
);

const Section = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) => (
	<section className="mt-7">
		<h3 className="mb-2 font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
			{title}
		</h3>
		{children}
	</section>
);

/** The text with the looked-up word (and its root) in bold, wherever it starts a word. */
const Marked = ({ text, words }: { text: string; words: string[] }) => {
	const escaped = words.map((word) =>
		word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
	);
	const pieces: ReactNode[] = [];
	const pattern = new RegExp(
		`(?<!\\p{L})(?:${escaped.join("|")})\\p{L}*`,
		"giu",
	);
	let last = 0;
	for (const match of text.matchAll(pattern)) {
		pieces.push(text.slice(last, match.index));
		pieces.push(
			<strong className="font-semibold text-stone-950" key={match.index}>
				{match[0]}
			</strong>,
		);
		last = (match.index ?? 0) + match[0].length;
	}
	pieces.push(text.slice(last));
	return pieces;
};
