import type { loadKindleLibrary } from "#/server/kindle-functions";

type Library = Awaited<ReturnType<typeof loadKindleLibrary>>;

export const findDisplacedKindleDrafts = (
	current: Library,
	next: Library,
	dirty: Set<string>,
	archived: boolean,
) => {
	return [...dirty].filter((key) => {
		const [asin, kind, rawId] = key.split(":");
		const before = current.books.find((book) => book.asin === asin);
		const after = next.books.find((book) => book.asin === asin);
		if (!before || !after) return true;
		const isVisible = archived
			? after.archivedAt !== null ||
				next.annotations.some((item) => item.bookAsin === asin)
			: after.archivedAt === null;
		if (
			!isVisible ||
			(archived && (before.archivedAt === null) !== (after.archivedAt === null))
		)
			return true;
		if (kind === "chapter")
			return !next.chapters.some((chapter) => chapter.id === Number(rawId));
		if (kind === "highlight") {
			const oldItem = current.annotations.find(
				(item) => item.id === Number(rawId),
			);
			const newItem = next.annotations.find(
				(item) => item.id === Number(rawId),
			);
			return !oldItem || !newItem || oldItem.chapterId !== newItem.chapterId;
		}
		return false;
	});
};
