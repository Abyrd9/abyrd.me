import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";
import { loadFlashcardDecks } from "#/server/flashcard-functions";
import type {
	AlgorithmDeck,
	ArchitecturePatternCard,
	FlashcardDecks,
	SystemTermCard,
} from "#/server/flashcards";
import {
	findSearchResults as findStudySearchResults,
	type SearchFilter,
	type SearchResult,
} from "#/study-search";

type Deck = "terms" | "patterns" | "algorithms";

export const Route = createFileRoute("/_authenticated/quiz")({
	component: StudyFlashcards,
});

function StudyFlashcards() {
	const [decks, setDecks] = useState<FlashcardDecks | null>(null);
	const [deck, setDeck] = useState<Deck>("terms");
	const [search, setSearch] = useState("");
	const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
	const [termIndex, setTermIndex] = useState(0);
	const [patternIndex, setPatternIndex] = useState(0);
	const [algorithmIndex, setAlgorithmIndex] = useState(0);
	const [algorithmCardIndex, setAlgorithmCardIndex] = useState(0);
	const [showTermAnswer, setShowTermAnswer] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;

		void loadFlashcardDecks()
			.then((nextDecks) => {
				if (isCurrent) setDecks(nextDecks);
			})
			.catch(() => {
				if (isCurrent) {
					setMessage("Could not load your flashcards. Refresh and try again.");
				}
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	function chooseDeck(nextDeck: Deck) {
		setDeck(nextDeck);
		setSearch("");
		setMessage(null);
		setShowTermAnswer(false);
	}

	function chooseTerm(index: number) {
		setTermIndex(index);
		setShowTermAnswer(false);
	}

	function chooseAlgorithm(index: number) {
		setAlgorithmIndex(index);
		setAlgorithmCardIndex(0);
	}

	function choosePattern(index: number) {
		setPatternIndex(index);
	}

	if (message) return <Message>{message}</Message>;
	if (!decks) return <Loading />;

	const term = decks.systemTerms[termIndex];
	const pattern = decks.architecturePatterns[patternIndex];
	const algorithm = decks.algorithms[algorithmIndex];
	const searchResults = findStudySearchResults(decks, search, searchFilter);
	const isSearching = search.trim().length > 0;

	function openSearchResult(result: SearchResult) {
		setSearch("");
		if (result.type === "concept") {
			setDeck("terms");
			chooseTerm(result.index);
			return;
		}
		if (result.type === "architecture-pattern") {
			setDeck("patterns");
			choosePattern(result.index);
			return;
		}
		setDeck("algorithms");
		chooseAlgorithm(result.index);
	}

	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-blue-700">Study cards</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Learn the building blocks.
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					Review a system-design term or work through a clean algorithm solution
					in TypeScript and Go.
				</p>
			</div>

			<SearchBox
				filter={searchFilter}
				onFilterChange={setSearchFilter}
				onSearchChange={setSearch}
				search={search}
			/>

			<nav
				className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:gap-3"
				aria-label="Study decks"
			>
				<DeckButton
					active={deck === "terms"}
					onClick={() => chooseDeck("terms")}
				>
					System design terms
				</DeckButton>
				<DeckButton
					active={deck === "patterns"}
					onClick={() => chooseDeck("patterns")}
				>
					Architecture catalog
				</DeckButton>
				<DeckButton
					active={deck === "algorithms"}
					onClick={() => chooseDeck("algorithms")}
				>
					Algorithms
				</DeckButton>
			</nav>

			{isSearching ? (
				<SearchResults onOpen={openSearchResult} results={searchResults} />
			) : null}
			{!isSearching && deck === "terms" ? (
				<TermsDeck
					onChoose={chooseTerm}
					onMove={(direction) => {
						setTermIndex((index) =>
							move(index, direction, decks.systemTerms.length),
						);
						setShowTermAnswer(false);
					}}
					onTurn={() => setShowTermAnswer((isShown) => !isShown)}
					selectedIndex={termIndex}
					showAnswer={showTermAnswer}
					term={term}
					terms={decks.systemTerms}
				/>
			) : null}
			{!isSearching && deck === "patterns" ? (
				<PatternsDeck
					onChoose={choosePattern}
					onMove={(direction) =>
						setPatternIndex((index) =>
							move(index, direction, decks.architecturePatterns.length),
						)
					}
					pattern={pattern}
					patterns={decks.architecturePatterns}
					selectedIndex={patternIndex}
				/>
			) : null}
			{!isSearching && deck === "algorithms" ? (
				<AlgorithmsDeck
					algorithm={algorithm}
					algorithmCardIndex={algorithmCardIndex}
					algorithms={decks.algorithms}
					onChoose={chooseAlgorithm}
					onMoveCard={(direction) =>
						setAlgorithmCardIndex((index) =>
							Math.min(
								Math.max(index + direction, 0),
								algorithm.cards.length - 1,
							),
						)
					}
					selectedIndex={algorithmIndex}
				/>
			) : null}
		</section>
	);
}

function TermsDeck({
	terms,
	term,
	selectedIndex,
	showAnswer,
	onChoose,
	onMove,
	onTurn,
}: {
	terms: readonly SystemTermCard[];
	term: SystemTermCard;
	selectedIndex: number;
	showAnswer: boolean;
	onChoose: (index: number) => void;
	onMove: (direction: number) => void;
	onTurn: () => void;
}) {
	return (
		<div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
			<ItemPicker
				items={terms}
				onChoose={onChoose}
				selectedIndex={selectedIndex}
				label="Terms"
			/>
			<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-blue-700">
					Term {selectedIndex + 1} of {terms.length}
				</p>
				{showAnswer ? <TermAnswer term={term} /> : <TermFront term={term} />}
				<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						onClick={() => onMove(-1)}
					>
						Previous term
					</Button>
					<Button className="w-full sm:w-auto" onClick={onTurn}>
						{showAnswer ? "Show term" : "Show definition"}
					</Button>
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						onClick={() => onMove(1)}
					>
						Next term
					</Button>
				</div>
			</article>
		</div>
	);
}

function TermFront({ term }: { term: SystemTermCard }) {
	return (
		<div className="mt-8 min-h-52 content-center text-center sm:mt-12 sm:min-h-60">
			<h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
				{term.term}
			</h2>
			<p className="mt-5 leading-7 text-slate-600 sm:text-lg sm:leading-8">
				What does this mean, and why would you use it?
			</p>
		</div>
	);
}

function TermAnswer({ term }: { term: SystemTermCard }) {
	return (
		<div className="mt-8 grid gap-6">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
					{term.term}
				</h2>
				<p className="mt-4 leading-7 text-slate-700 sm:text-lg sm:leading-8">
					{term.definition}
				</p>
			</div>
			<AnswerSection title="Why it matters">{term.whyItMatters}</AnswerSection>
			<AnswerSection title="Example">{term.example}</AnswerSection>
		</div>
	);
}

function PatternsDeck({
	patterns,
	pattern,
	selectedIndex,
	onChoose,
	onMove,
}: {
	patterns: readonly ArchitecturePatternCard[];
	pattern: ArchitecturePatternCard;
	selectedIndex: number;
	onChoose: (index: number) => void;
	onMove: (direction: number) => void;
}) {
	return (
		<div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
			<ItemPicker
				items={patterns}
				label="Patterns"
				onChoose={onChoose}
				selectedIndex={selectedIndex}
			/>
			<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-blue-700">
					{formatArchitectureType(pattern.architectureType)} {selectedIndex + 1}{" "}
					of {patterns.length}
				</p>
				<h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
					{pattern.title}
				</h2>
				<p className="mt-4 leading-7 text-slate-700 sm:text-lg sm:leading-8">
					{pattern.description}
				</p>
				<div className="mt-7 grid gap-4 sm:grid-cols-2">
					<AnswerSection title="What it solves">{pattern.solves}</AnswerSection>
					<AnswerSection title="When to use it">
						{pattern.useWhen}
					</AnswerSection>
					<AnswerSection title="Main cost or risk">
						{pattern.tradeoff}
					</AnswerSection>
					<AnswerSection title="Example">{pattern.example}</AnswerSection>
				</div>
				<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						onClick={() => onMove(-1)}
					>
						Previous item
					</Button>
					<Button className="w-full sm:w-auto" onClick={() => onMove(1)}>
						Next item
					</Button>
				</div>
				<a
					className="mt-6 inline-flex text-sm font-semibold text-blue-700 underline underline-offset-4"
					href="https://en.wikipedia.org/wiki/List_of_software_architecture_styles_and_patterns"
					rel="noreferrer"
					target="_blank"
				>
					Read the architecture catalog source
				</a>
			</article>
		</div>
	);
}

function SearchBox({
	search,
	filter,
	onSearchChange,
	onFilterChange,
}: {
	search: string;
	filter: SearchFilter;
	onSearchChange: (value: string) => void;
	onFilterChange: (filter: SearchFilter) => void;
}) {
	const filters: readonly { value: SearchFilter; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "concept", label: "Concepts" },
		{ value: "architecture-pattern", label: "Patterns" },
		{ value: "algorithm", label: "Algorithms" },
	];

	return (
		<section className="mt-8 max-w-3xl">
			<label
				className="text-sm font-semibold text-slate-800"
				htmlFor="study-search"
			>
				Search study cards
			</label>
			<input
				className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
				id="study-search"
				onChange={(event) => onSearchChange(event.target.value)}
				placeholder="Try cache, CQRS, queue, or Two Sum"
				value={search}
			/>
			<fieldset className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
				<legend className="sr-only">Search filters</legend>
				{filters.map((item) => (
					<Button
						className={
							filter === item.value
								? "min-h-10 w-full bg-slate-200 px-3 sm:w-auto"
								: "min-h-10 w-full px-3 sm:w-auto"
						}
						key={item.value}
						onClick={() => onFilterChange(item.value)}
					>
						{item.label}
					</Button>
				))}
			</fieldset>
		</section>
	);
}

function SearchResults({
	results,
	onOpen,
}: {
	results: readonly SearchResult[];
	onOpen: (result: SearchResult) => void;
}) {
	return (
		<section className="mt-8">
			<h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
				Search results
			</h2>
			{results.length === 0 ? (
				<p className="mt-4 leading-7 text-slate-600">
					No cards match that search. Try a shorter or broader word.
				</p>
			) : (
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					{results.map((result) => (
						<article
							className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
							key={`${result.type}-${result.index}`}
						>
							<p className="text-sm font-medium text-blue-700">
								{searchResultLabel(result.type, result.architectureType)}
							</p>
							<h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
								{result.title}
							</h3>
							<p className="mt-3 leading-7 text-slate-600">
								{result.description}
							</p>
							<Button
								className="mt-5 self-start"
								onClick={() => onOpen(result)}
							>
								Open card
							</Button>
						</article>
					))}
				</div>
			)}
		</section>
	);
}

function AlgorithmsDeck({
	algorithms,
	algorithm,
	selectedIndex,
	algorithmCardIndex,
	onChoose,
	onMoveCard,
}: {
	algorithms: readonly AlgorithmDeck[];
	algorithm: AlgorithmDeck;
	selectedIndex: number;
	algorithmCardIndex: number;
	onChoose: (index: number) => void;
	onMoveCard: (direction: number) => void;
}) {
	const card = algorithm.cards[algorithmCardIndex];
	const isFirstCard = algorithmCardIndex === 0;
	const isLastCard = algorithmCardIndex === algorithm.cards.length - 1;

	return (
		<div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
			<ItemPicker
				items={algorithms}
				label="Problems"
				onChoose={onChoose}
				selectedIndex={selectedIndex}
			/>
			<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-blue-700">
					{algorithm.title} · Card {algorithmCardIndex + 1} of{" "}
					{algorithm.cards.length}
				</p>
				<h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
					{card.heading}
				</h2>
				<p className="mt-4 leading-7 text-slate-700 sm:text-lg sm:leading-8">
					{card.body}
				</p>
				{card.code ? (
					<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-black">
						<p className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">
							{card.language}
						</p>
						<pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
							<code>{card.code}</code>
						</pre>
					</section>
				) : null}
				<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						disabled={isFirstCard}
						onClick={() => onMoveCard(-1)}
					>
						Previous card
					</Button>
					<Button
						className="w-full sm:w-auto"
						disabled={isLastCard}
						onClick={() => onMoveCard(1)}
					>
						Next card
					</Button>
				</div>
			</article>
		</div>
	);
}

function ItemPicker<T extends { id: string; title?: string; term?: string }>({
	items,
	selectedIndex,
	onChoose,
	label,
}: {
	items: readonly T[];
	selectedIndex: number;
	onChoose: (index: number) => void;
	label: string;
}) {
	return (
		<aside>
			<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
				{label}
			</h2>
			<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
				{items.map((item, index) => (
					<Button
						className={
							index === selectedIndex
								? "w-full bg-slate-200 text-left"
								: "w-full text-left"
						}
						key={item.id}
						onClick={() => onChoose(index)}
					>
						{item.title ?? item.term}
					</Button>
				))}
			</div>
		</aside>
	);
}

function AnswerSection({
	title,
	children,
}: {
	title: string;
	children: string;
}) {
	return (
		<section className="rounded-xl bg-slate-50 p-4">
			<h3 className="font-semibold text-slate-950">{title}</h3>
			<p className="mt-2 leading-7 text-slate-700">{children}</p>
		</section>
	);
}

function DeckButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: string;
	onClick: () => void;
}) {
	return (
		<Button
			className={active ? "w-full bg-slate-200 sm:w-auto" : "w-full sm:w-auto"}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function Loading() {
	return <p className="py-14 text-slate-600">Loading flashcards…</p>;
}

function Message({ children }: { children: string }) {
	return <p className="py-14 text-red-700">{children}</p>;
}

function move(index: number, direction: number, length: number) {
	return (index + direction + length) % length;
}

function searchResultLabel(
	type: SearchResult["type"],
	architectureType?: ArchitecturePatternCard["architectureType"],
) {
	if (type === "concept") return "System concept";
	if (type === "architecture-pattern") {
		return `Architecture ${formatArchitectureType(architectureType ?? "pattern")}`;
	}
	return "Algorithm";
}

function formatArchitectureType(
	architectureType: ArchitecturePatternCard["architectureType"],
) {
	return architectureType === "style" ? "Style" : "Pattern";
}
