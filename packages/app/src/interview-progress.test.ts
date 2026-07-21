import { expect, test } from "bun:test";
import {
	completeInterview,
	createInterviewProgress,
	dueInterviewIds,
	setInterviewMissReasons,
} from "./interview-progress";

test("schedules completed work after 1, 3, 7, then 14 days", () => {
	let progress = createInterviewProgress();

	progress = completeInterview(progress, "two-sum", "2026-07-01");
	expect(progress.attempts["two-sum"].dueOn).toBe("2026-07-02");

	progress = completeInterview(progress, "two-sum", "2026-07-02");
	expect(progress.attempts["two-sum"].dueOn).toBe("2026-07-05");

	progress = completeInterview(progress, "two-sum", "2026-07-05");
	expect(progress.attempts["two-sum"].dueOn).toBe("2026-07-12");

	progress = completeInterview(progress, "two-sum", "2026-07-12");
	expect(progress.attempts["two-sum"].dueOn).toBe("2026-07-26");
});

test("returns due work in due-date order and records miss reasons", () => {
	let progress = createInterviewProgress();
	progress = completeInterview(progress, "two-sum", "2026-07-01");
	progress = completeInterview(progress, "rate-limiter", "2026-07-03");
	progress = setInterviewMissReasons(progress, "two-sum", ["pattern"]);

	expect(dueInterviewIds(progress, "2026-07-04")).toEqual([
		"two-sum",
		"rate-limiter",
	]);
	expect(progress.attempts["two-sum"].missReasons).toEqual(["pattern"]);
});
