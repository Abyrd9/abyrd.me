import type {
	ArchitecturePatternCard,
	FlashcardDecks,
} from "#/server/flashcards";

export type SearchFilter =
	| "all"
	| "concept"
	| "architecture-pattern"
	| "algorithm";

export type SearchResult = {
	type: Exclude<SearchFilter, "all">;
	index: number;
	title: string;
	description: string;
	architectureType?: ArchitecturePatternCard["architectureType"];
};

export function findSearchResults(
	decks: FlashcardDecks,
	search: string,
	filter: SearchFilter,
): readonly SearchResult[] {
	const query = search.trim().toLowerCase();
	if (!query) return [];

	const results: SearchResult[] = [];
	if (filter === "all" || filter === "concept") {
		decks.systemTerms.forEach((card, index) => {
			if (
				_matches(query, [
					card.term,
					card.definition,
					card.whyItMatters,
					card.example,
				])
			) {
				results.push({
					type: "concept",
					index,
					title: card.term,
					description: card.definition,
				});
			}
		});
	}

	if (filter === "all" || filter === "architecture-pattern") {
		decks.architecturePatterns.forEach((card, index) => {
			if (
				_matches(query, [
					card.title,
					card.description,
					card.solves,
					card.useWhen,
					card.tradeoff,
					card.example,
				])
			) {
				results.push({
					type: "architecture-pattern",
					index,
					title: card.title,
					description: card.description,
					architectureType: card.architectureType,
				});
			}
		});
	}

	if (filter === "all" || filter === "algorithm") {
		decks.algorithms.forEach((algorithm, index) => {
			if (
				_matches(query, [
					algorithm.title,
					algorithm.summary,
					...algorithm.cards.flatMap((card) => [
						card.heading,
						card.body,
						card.language ?? "",
						card.code ?? "",
					]),
				])
			) {
				results.push({
					type: "algorithm",
					index,
					title: algorithm.title,
					description: algorithm.summary,
				});
			}
		});
	}

	return results;
}

function _matches(query: string, values: readonly string[]) {
	return values.some((value) => value.toLowerCase().includes(query));
}
