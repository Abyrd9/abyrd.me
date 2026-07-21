import type { StudyAnswerFeedback } from "#/server/study";

const storageKey = "abyrd.study-progress.v1";

export type SessionProgress = {
	questionIndex: number;
	feedback: Record<string, StudyAnswerFeedback>;
	flashcardRatings: Record<string, "know" | "review">;
};

export type CourseProgress = {
	lessonIndex: number;
	completed: boolean;
};

export type StudyProgress = {
	version: 1;
	practiceAttempt: number;
	sessions: Record<string, SessionProgress>;
	courses: Record<string, CourseProgress>;
};

export function createStudyProgress(): StudyProgress {
	return {
		version: 1,
		practiceAttempt: 0,
		sessions: {},
		courses: {},
	};
}

export function loadStudyProgress(): StudyProgress {
	if (typeof window === "undefined") return createStudyProgress();

	try {
		const stored = window.localStorage.getItem(storageKey);
		if (!stored) return createStudyProgress();

		const parsed: unknown = JSON.parse(stored);
		if (!_isStudyProgress(parsed)) return createStudyProgress();

		return parsed;
	} catch {
		return createStudyProgress();
	}
}

export function saveStudyProgress(progress: StudyProgress) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

export function sessionProgress(
	progress: StudyProgress,
	sessionId: string,
): SessionProgress {
	return (
		progress.sessions[sessionId] ?? {
			questionIndex: 0,
			feedback: {},
			flashcardRatings: {},
		}
	);
}

export function courseProgress(
	progress: StudyProgress,
	courseId: string,
): CourseProgress {
	return progress.courses[courseId] ?? { lessonIndex: 0, completed: false };
}

function _isStudyProgress(value: unknown): value is StudyProgress {
	if (!value || typeof value !== "object") return false;

	const progress = value as Partial<StudyProgress>;
	return (
		progress.version === 1 &&
		typeof progress.practiceAttempt === "number" &&
		Boolean(progress.sessions) &&
		Boolean(progress.courses)
	);
}
