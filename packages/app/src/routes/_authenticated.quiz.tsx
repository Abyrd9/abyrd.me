import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";
import { loadFlashcardDecks } from "#/server/flashcard-functions";
import type {
	AlgorithmDeck,
	FlashcardDecks,
	SystemTermCard,
} from "#/server/flashcards";

type Deck = "terms" | "algorithms";

export const Route = createFileRoute("/_authenticated/quiz")({
	component: StudyFlashcards,
});

function StudyFlashcards() {
	const [decks, setDecks] = useState<FlashcardDecks | null>(null);
	const [deck, setDeck] = useState<Deck>("terms");
	const [termIndex, setTermIndex] = useState(0);
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

	if (message) return <Message>{message}</Message>;
	if (!decks) return <Loading />;

	const term = decks.systemTerms[termIndex];
	const algorithm = decks.algorithms[algorithmIndex];

	return (
		<section className="flex flex-1 flex-col py-10 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-blue-700">Study cards</p>
				<h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
					Learn the building blocks.
				</h1>
				<p className="mt-4 text-lg leading-8 text-slate-600">
					Review a system-design term or work through a clean algorithm solution
					in TypeScript and Go.
				</p>
			</div>

			<nav className="mt-8 flex flex-wrap gap-3" aria-label="Study decks">
				<DeckButton
					active={deck === "terms"}
					onClick={() => chooseDeck("terms")}
				>
					System design terms
				</DeckButton>
				<DeckButton
					active={deck === "algorithms"}
					onClick={() => chooseDeck("algorithms")}
				>
					Algorithms
				</DeckButton>
			</nav>

			{deck === "terms" ? (
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
			) : (
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
			)}
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
			<article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-blue-700">
					Term {selectedIndex + 1} of {terms.length}
				</p>
				{showAnswer ? <TermAnswer term={term} /> : <TermFront term={term} />}
				<div className="mt-8 flex flex-wrap gap-3">
					<Button
						className="bg-slate-200 text-slate-800 hover:bg-slate-300"
						onClick={() => onMove(-1)}
					>
						Previous term
					</Button>
					<Button onClick={onTurn}>
						{showAnswer ? "Show term" : "Show definition"}
					</Button>
					<Button
						className="bg-slate-200 text-slate-800 hover:bg-slate-300"
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
		<div className="mt-12 min-h-60 content-center text-center">
			<h2 className="text-4xl font-semibold tracking-tight text-slate-950">
				{term.term}
			</h2>
			<p className="mt-5 text-lg leading-8 text-slate-600">
				What does this mean, and why would you use it?
			</p>
		</div>
	);
}

function TermAnswer({ term }: { term: SystemTermCard }) {
	return (
		<div className="mt-8 grid gap-6">
			<div>
				<h2 className="text-3xl font-semibold tracking-tight text-slate-950">
					{term.term}
				</h2>
				<p className="mt-4 text-lg leading-8 text-slate-700">
					{term.definition}
				</p>
			</div>
			<AnswerSection title="Why it matters">{term.whyItMatters}</AnswerSection>
			<AnswerSection title="Example">{term.example}</AnswerSection>
		</div>
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
			<article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-blue-700">
					{algorithm.title} · Card {algorithmCardIndex + 1} of{" "}
					{algorithm.cards.length}
				</p>
				<h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
					{card.heading}
				</h2>
				<p className="mt-4 text-lg leading-8 text-slate-700">{card.body}</p>
				{card.code ? (
					<section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
						<p className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">
							{card.language}
						</p>
						<pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
							<code>{card.code}</code>
						</pre>
					</section>
				) : null}
				<div className="mt-8 flex flex-wrap gap-3">
					<Button
						className="bg-slate-200 text-slate-800 hover:bg-slate-300"
						disabled={isFirstCard}
						onClick={() => onMoveCard(-1)}
					>
						Previous card
					</Button>
					<Button disabled={isLastCard} onClick={() => onMoveCard(1)}>
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
			<div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
				{items.map((item, index) => (
					<Button
						className={
							index === selectedIndex
								? "shrink-0 text-left lg:w-full"
								: "shrink-0 bg-slate-200 text-left text-slate-800 hover:bg-slate-300 lg:w-full"
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
			className={
				active ? undefined : "bg-slate-200 text-slate-800 hover:bg-slate-300"
			}
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
