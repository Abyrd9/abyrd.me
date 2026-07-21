const storageKey = "abyrd.interview-progress.v1";

export type MissReason =
	| "pattern"
	| "code"
	| "edge-case"
	| "scale"
	| "trade-off"
	| "explanation"
	| "current-fact";

export type InterviewAttempt = {
	completedOn: string;
	dueOn: string;
	reviewCount: number;
	missReasons: readonly MissReason[];
};

export type InterviewProgress = {
	version: 1;
	attempts: Record<string, InterviewAttempt>;
};

const reviewDelays = [1, 3, 7, 14] as const;

export function createInterviewProgress(): InterviewProgress {
	return { version: 1, attempts: {} };
}

export function loadInterviewProgress(): InterviewProgress {
	if (typeof window === "undefined") return createInterviewProgress();

	try {
		const stored = window.localStorage.getItem(storageKey);
		if (!stored) return createInterviewProgress();

		const parsed: unknown = JSON.parse(stored);
		return _isInterviewProgress(parsed) ? parsed : createInterviewProgress();
	} catch {
		return createInterviewProgress();
	}
}

export function saveInterviewProgress(progress: InterviewProgress) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

export function completeInterview(
	progress: InterviewProgress,
	rehearsalId: string,
	today: string,
): InterviewProgress {
	const previous = progress.attempts[rehearsalId];
	const reviewCount = (previous?.reviewCount ?? -1) + 1;
	const delay = reviewDelays[Math.min(reviewCount, reviewDelays.length - 1)];

	return {
		...progress,
		attempts: {
			...progress.attempts,
			[rehearsalId]: {
				completedOn: today,
				dueOn: _addDays(today, delay),
				reviewCount,
				missReasons: previous?.missReasons ?? [],
			},
		},
	};
}

export function setInterviewMissReasons(
	progress: InterviewProgress,
	rehearsalId: string,
	missReasons: readonly MissReason[],
): InterviewProgress {
	const attempt = progress.attempts[rehearsalId];
	if (!attempt) return progress;

	return {
		...progress,
		attempts: {
			...progress.attempts,
			[rehearsalId]: { ...attempt, missReasons },
		},
	};
}

export function dueInterviewIds(progress: InterviewProgress, today: string) {
	return Object.entries(progress.attempts)
		.filter(([, attempt]) => attempt.dueOn <= today)
		.sort(([, left], [, right]) => left.dueOn.localeCompare(right.dueOn))
		.map(([rehearsalId]) => rehearsalId);
}

function _addDays(dateString: string, days: number) {
	const date = new Date(`${dateString}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function _isInterviewProgress(value: unknown): value is InterviewProgress {
	if (!value || typeof value !== "object") return false;
	const progress = value as Partial<InterviewProgress>;
	return progress.version === 1 && Boolean(progress.attempts);
}
