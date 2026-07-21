import { Data, Effect } from "effect";

export type StudyTopic = "algorithms" | "system-design" | "programming" | "web";

export type StudyQuestionKind =
	| "flashcard"
	| "multiple-choice"
	| "written"
	| "code";

type StudyDifficulty = "foundation" | "intermediate" | "advanced";

type QuestionBase = {
	id: string;
	title: string;
	topic: StudyTopic;
	difficulty: StudyDifficulty;
	tags: readonly string[];
	explanation: string;
};

type FlashcardQuestion = QuestionBase & {
	kind: "flashcard";
	prompt: string;
	answer: string;
};

type MultipleChoiceQuestion = QuestionBase & {
	kind: "multiple-choice";
	prompt: string;
	options: readonly {
		id: string;
		label: string;
	}[];
	correctOptionId: string;
};

type WrittenQuestion = QuestionBase & {
	kind: "written";
	prompt: string;
	placeholder: string;
	referenceAnswer: string;
	rubric: readonly string[];
};

type CodeQuestion = QuestionBase & {
	kind: "code";
	prompt: string;
	language: string;
	starterCode: string;
	referenceAnswer: string;
	rubric: readonly string[];
};

type StudyQuestion =
	| FlashcardQuestion
	| MultipleChoiceQuestion
	| WrittenQuestion
	| CodeQuestion;

export type StudyQuestionPublic =
	| (Omit<FlashcardQuestion, "answer" | "explanation"> & {
			explanation?: never;
	  })
	| (Omit<MultipleChoiceQuestion, "correctOptionId" | "explanation"> & {
			explanation?: never;
	  })
	| (Omit<WrittenQuestion, "referenceAnswer" | "rubric" | "explanation"> & {
			explanation?: never;
	  })
	| (Omit<CodeQuestion, "referenceAnswer" | "rubric" | "explanation"> & {
			explanation?: never;
	  });

export type StudyAnswerFeedback = {
	questionId: string;
	kind: StudyQuestionKind;
	correct: boolean | null;
	answer: string;
	explanation: string;
	rubric: readonly string[];
};

export type StudySessionPublic = {
	id: string;
	label: string;
	questions: readonly StudyQuestionPublic[];
};

type CourseBlock =
	| {
			id: string;
			kind: "concept";
			title: string;
			body: string;
	  }
	| {
			id: string;
			kind: "checkpoint" | "challenge";
			title: string;
			body: string;
			questionId: string;
	  };

type StudyCourse = {
	id: string;
	title: string;
	summary: string;
	outcomes: readonly string[];
	lessons: readonly CourseBlock[];
	assessmentQuestionIds: readonly string[];
};

export type StudyCourseSummary = Pick<
	StudyCourse,
	"id" | "title" | "summary" | "outcomes"
> & {
	lessonCount: number;
};

export type StudyCoursePublic = Omit<StudyCourse, "lessons"> & {
	lessons: readonly (
		| Extract<CourseBlock, { kind: "concept" }>
		| (Omit<Extract<CourseBlock, { questionId: string }>, "questionId"> & {
				question: StudyQuestionPublic;
		  })
	)[];
	assessment: readonly StudyQuestionPublic[];
};

export class StudyQuestionNotFound extends Data.TaggedError(
	"StudyQuestionNotFound",
)<{ questionId: string }> {}

export class StudyCourseNotFound extends Data.TaggedError(
	"StudyCourseNotFound",
)<{
	courseId: string;
}> {}

const topics: readonly StudyTopic[] = [
	"algorithms",
	"system-design",
	"programming",
	"web",
];

const kinds: readonly StudyQuestionKind[] = [
	"flashcard",
	"multiple-choice",
	"written",
	"code",
];

const questions: readonly StudyQuestion[] = [
	{
		id: "algorithms-window-invariant",
		kind: "flashcard",
		title: "Sliding window invariant",
		topic: "algorithms",
		difficulty: "foundation",
		tags: ["arrays", "sliding-window"],
		prompt: "What is the invariant of a sliding-window algorithm?",
		answer:
			"A condition that is true for the current window at every step. Expand or shrink the window only to restore that condition, so every pointer moves forward at most n times.",
		explanation:
			"Naming the invariant first turns a two-pointer trick into a proof of correctness and linear time.",
	},
	{
		id: "algorithms-window-choice",
		kind: "multiple-choice",
		title: "Choose the pattern",
		topic: "algorithms",
		difficulty: "intermediate",
		tags: ["strings", "sliding-window"],
		prompt:
			"Which invariant best solves “longest substring without repeating characters”?",
		options: [
			{ id: "a", label: "The window is always sorted." },
			{ id: "b", label: "The window contains no duplicate character." },
			{ id: "c", label: "The window sum is never negative." },
			{ id: "d", label: "The left pointer moves once per right pointer." },
		],
		correctOptionId: "b",
		explanation:
			"Track each character’s most recent index. When a duplicate enters, move the left edge past its previous occurrence.",
	},
	{
		id: "algorithms-window-written",
		kind: "written",
		title: "Explain the complexity",
		topic: "algorithms",
		difficulty: "intermediate",
		tags: ["complexity", "two-pointers"],
		prompt:
			"Explain why a variable-size sliding window is O(n), even though it has a nested while loop.",
		placeholder: "State what each pointer does across the full input…",
		referenceAnswer:
			"The nested loop is amortized, not independent. The right pointer advances from 0 to n once, and the left pointer also advances from 0 to n at most once. Across the whole run there are at most 2n pointer advances, so the work is O(n).",
		rubric: [
			"Identifies the amortized argument.",
			"Explains that each pointer only moves forward.",
			"Concludes O(n), not O(n²).",
		],
		explanation:
			"Interviewers look for the global pointer count, not just the visual shape of the loop nesting.",
	},
	{
		id: "algorithms-window-code",
		kind: "code",
		title: "Longest unique substring",
		topic: "algorithms",
		difficulty: "advanced",
		tags: ["strings", "hash-map", "sliding-window"],
		prompt:
			"Implement longestUniqueSubstring. Return the length of the longest substring with no repeated characters.",
		language: "TypeScript",
		starterCode:
			"export function longestUniqueSubstring(value: string): number {\n\t// Write your solution\n}\n",
		referenceAnswer:
			"export function longestUniqueSubstring(value: string): number {\n\tconst lastSeen = new Map<string, number>();\n\tlet best = 0;\n\tlet left = 0;\n\n\tfor (let right = 0; right < value.length; right += 1) {\n\t\tconst character = value[right];\n\t\tconst previous = lastSeen.get(character);\n\n\t\tif (previous !== undefined && previous >= left) left = previous + 1;\n\n\t\tlastSeen.set(character, right);\n\t\tbest = Math.max(best, right - left + 1);\n\t}\n\n\treturn best;\n}\n",
		rubric: [
			"Uses a moving left boundary and one pass of the right boundary.",
			"Tracks prior character positions.",
			"Does not move left backward.",
			"Explains O(n) time and O(min(n, alphabet)) space.",
		],
		explanation:
			"The key edge case is a repeated character that is already outside the current window; it must not pull left backward.",
	},
	{
		id: "system-design-requirements",
		kind: "flashcard",
		title: "Functional versus non-functional",
		topic: "system-design",
		difficulty: "foundation",
		tags: ["requirements", "interviews"],
		prompt:
			"Before drawing architecture, what is the difference between functional and non-functional requirements?",
		answer:
			"Functional requirements describe what the system does (for example, create and redirect short links). Non-functional requirements describe qualities and constraints (latency, availability, scale, consistency, cost, and retention).",
		explanation:
			"Starting with both categories prevents an attractive diagram from solving the wrong problem.",
	},
	{
		id: "system-design-choice",
		kind: "multiple-choice",
		title: "Read-heavy URL shortener",
		topic: "system-design",
		difficulty: "intermediate",
		tags: ["caching", "url-shortener"],
		prompt:
			"A URL shortener is overwhelmingly read-heavy. Which change most directly reduces database reads for popular links?",
		options: [
			{ id: "a", label: "Use longer short codes." },
			{ id: "b", label: "Add a cache in front of the primary mapping store." },
			{ id: "c", label: "Make the write API synchronous." },
			{ id: "d", label: "Store analytics in the same row as the link." },
		],
		correctOptionId: "b",
		explanation:
			"A cache turns repeated code-to-URL lookups into memory reads while the durable mapping store remains the source of truth.",
	},
	{
		id: "system-design-written",
		kind: "written",
		title: "Estimate before architecture",
		topic: "system-design",
		difficulty: "intermediate",
		tags: ["capacity-planning", "url-shortener"],
		prompt:
			"Name the first capacity estimates you would make for a URL shortener and explain how they change your design.",
		placeholder: "Think about reads, writes, storage, and latency…",
		referenceAnswer:
			"Estimate daily link creations, redirects per link, peak versus average QPS, record size and retention, and acceptable redirect latency. Those figures size the mapping store, tell you whether a cache/CDN is necessary, guide partitioning, and establish how much availability and replication the read path needs.",
		rubric: [
			"Covers reads and writes separately.",
			"Mentions peak load or a peak factor.",
			"Connects estimates to storage, cache, partitioning, or replication choices.",
		],
		explanation:
			"Back-of-the-envelope numbers make design trade-offs concrete and reveal which path deserves optimization.",
	},
	{
		id: "system-design-code",
		kind: "code",
		title: "Base62 encoder",
		topic: "system-design",
		difficulty: "intermediate",
		tags: ["encoding", "url-shortener"],
		prompt:
			"Implement encodeBase62 for a non-negative integer ID. This is one possible short-code building block.",
		language: "TypeScript",
		starterCode:
			"export function encodeBase62(id: number): string {\n\t// Write your solution\n}\n",
		referenceAnswer:
			'const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";\n\nexport function encodeBase62(id: number): string {\n\tif (!Number.isSafeInteger(id) || id < 0) throw new Error("id must be a non-negative safe integer");\n\tif (id === 0) return alphabet[0];\n\n\tlet value = id;\n\tlet encoded = "";\n\n\twhile (value > 0) {\n\t\tencoded = alphabet[value % alphabet.length] + encoded;\n\t\tvalue = Math.floor(value / alphabet.length);\n\t}\n\n\treturn encoded;\n}\n',
		rubric: [
			"Handles zero explicitly.",
			"Repeatedly divides by the alphabet base.",
			"Builds digits in reverse order or reverses them at the end.",
			"Notes that opaque public IDs may need a separate collision and enumeration strategy.",
		],
		explanation:
			"Base62 makes an integer compact, but production code generation still needs a decision about predictability, collisions, and availability.",
	},
	{
		id: "programming-idempotency",
		kind: "flashcard",
		title: "Idempotency",
		topic: "programming",
		difficulty: "foundation",
		tags: ["api-design", "retries"],
		prompt: "What makes an operation idempotent, and why does it matter?",
		answer:
			"Repeating an idempotent operation has the same intended effect as performing it once. It lets clients safely retry after timeouts without accidentally creating duplicate side effects.",
		explanation:
			"Idempotency keys and resource identifiers are common ways to make create-like operations retry-safe.",
	},
	{
		id: "programming-promise-choice",
		kind: "multiple-choice",
		title: "Promise concurrency",
		topic: "programming",
		difficulty: "intermediate",
		tags: ["javascript", "promises"],
		prompt: "What does Promise.all do when one of its input promises rejects?",
		options: [
			{
				id: "a",
				label: "It waits for all promises, then returns every result.",
			},
			{ id: "b", label: "It rejects as soon as one input rejects." },
			{ id: "c", label: "It retries the rejected promise automatically." },
			{ id: "d", label: "It converts rejected promises to undefined." },
		],
		correctOptionId: "b",
		explanation:
			"The other promises may still continue in the underlying runtime, but the Promise.all result rejects on the first rejection it observes.",
	},
	{
		id: "programming-state-written",
		kind: "written",
		title: "State ownership",
		topic: "programming",
		difficulty: "intermediate",
		tags: ["state", "design"],
		prompt: "How do you decide where state should live in a component tree?",
		placeholder: "Describe the smallest useful owner…",
		referenceAnswer:
			"Keep each piece of state in the lowest common owner of every component that needs to read or change it. Derive values from that state instead of duplicating them, and lift state only when siblings truly need to coordinate.",
		rubric: [
			"Names the lowest common owner.",
			"Avoids duplicate or contradictory state.",
			"Distinguishes derived values from independently stored state.",
		],
		explanation:
			"This principle applies beyond React: ownership should follow the smallest group that must coordinate.",
	},
	{
		id: "programming-debounce-code",
		kind: "code",
		title: "Debounce a callback",
		topic: "programming",
		difficulty: "advanced",
		tags: ["javascript", "closures", "timers"],
		prompt:
			"Implement debounce. The returned function should run the latest call only after waitMs has passed without another call.",
		language: "TypeScript",
		starterCode:
			"export function debounce<TArgs extends unknown[]>(\n\tcallback: (...args: TArgs) => void,\n\twaitMs: number,\n): (...args: TArgs) => void {\n\t// Write your solution\n}\n",
		referenceAnswer:
			"export function debounce<TArgs extends unknown[]>(\n\tcallback: (...args: TArgs) => void,\n\twaitMs: number,\n): (...args: TArgs) => void {\n\tlet timeoutId: ReturnType<typeof setTimeout> | undefined;\n\n\treturn (...args) => {\n\t\tif (timeoutId !== undefined) clearTimeout(timeoutId);\n\n\t\ttimeoutId = setTimeout(() => {\n\t\t\tcallback(...args);\n\t\t}, waitMs);\n\t};\n}\n",
		rubric: [
			"Keeps the timer in a closure.",
			"Clears a pending timer before scheduling another.",
			"Forwards the latest arguments.",
			"Can discuss cancellation or preserving this when asked.",
		],
		explanation:
			"The closure is the key: it gives all calls to the returned function access to one pending timer.",
	},
	{
		id: "web-cache-control",
		kind: "flashcard",
		title: "HTTP caching",
		topic: "web",
		difficulty: "foundation",
		tags: ["http", "caching"],
		prompt: "What does Cache-Control: max-age=60 communicate?",
		answer:
			"A response may be treated as fresh for 60 seconds from when it is stored. During that time a cache can reuse it without asking the origin, subject to the other directives present.",
		explanation:
			"Caching behavior depends on the complete directive set; private, no-store, and stale directives materially change the result.",
	},
	{
		id: "web-cors-choice",
		kind: "multiple-choice",
		title: "CORS preflight",
		topic: "web",
		difficulty: "intermediate",
		tags: ["http", "cors"],
		prompt: "Why does a browser send a CORS preflight request?",
		options: [
			{ id: "a", label: "To authenticate the user before every request." },
			{
				id: "b",
				label:
					"To ask whether a cross-origin request with certain methods or headers is allowed.",
			},
			{ id: "c", label: "To encrypt a request body." },
			{ id: "d", label: "To warm a CDN cache." },
		],
		correctOptionId: "b",
		explanation:
			"For non-simple cross-origin requests, the browser sends OPTIONS and checks the server’s allow-origin, allow-methods, and allow-headers response before the actual request.",
	},
	{
		id: "web-rendering-written",
		kind: "written",
		title: "Critical rendering path",
		topic: "web",
		difficulty: "intermediate",
		tags: ["browser", "performance"],
		prompt:
			"Explain why a large render-blocking stylesheet can delay first paint and name two ways to improve the experience.",
		placeholder: "Describe the dependency and practical mitigations…",
		referenceAnswer:
			"The browser needs CSSOM information before it can render reliably, so a stylesheet blocks painting while it is fetched and parsed. Reduce and split unused CSS, inline only critical CSS, preload needed assets, and defer non-critical styles when the visual trade-off is acceptable.",
		rubric: [
			"Connects CSS loading/parsing to render or paint delay.",
			"Offers at least two concrete mitigations.",
			"Avoids claiming every stylesheet should be deferred.",
		],
		explanation:
			"Performance answers are strongest when they connect a browser dependency to a measured user-visible outcome.",
	},
	{
		id: "web-debounce-hook-code",
		kind: "code",
		title: "Debounced React value",
		topic: "web",
		difficulty: "advanced",
		tags: ["react", "hooks", "performance"],
		prompt:
			"Implement useDebouncedValue. It should return a value that updates waitMs after the latest input change.",
		language: "TypeScript / React",
		starterCode:
			"export function useDebouncedValue<T>(value: T, waitMs: number): T {\n\t// Write your solution\n}\n",
		referenceAnswer:
			'import { useEffect, useState } from "react";\n\nexport function useDebouncedValue<T>(value: T, waitMs: number): T {\n\tconst [debouncedValue, setDebouncedValue] = useState(value);\n\n\tuseEffect(() => {\n\t\tconst timeoutId = setTimeout(() => setDebouncedValue(value), waitMs);\n\t\treturn () => clearTimeout(timeoutId);\n\t}, [value, waitMs]);\n\n\treturn debouncedValue;\n}\n',
		rubric: [
			"Uses state for the displayed debounced value.",
			"Sets and cleans up a timer in an effect.",
			"Includes value and waitMs as dependencies.",
			"Can explain why cleanup avoids stale timer updates.",
		],
		explanation:
			"The effect cleanup gives each value change a cancellation point before the next timer becomes active.",
	},
];

const courses: readonly StudyCourse[] = [
	{
		id: "url-shortener",
		title: "Design a URL Shortener",
		summary:
			"Move from ambiguous requirements to a defendable read-heavy architecture.",
		outcomes: [
			"Frame requirements before components.",
			"Use estimates to justify design choices.",
			"Explain the cache, mapping-store, and analytics trade-offs.",
		],
		lessons: [
			{
				id: "requirements",
				kind: "concept",
				title: "Start with the contract",
				body: "Ask what a link creator and a redirect reader must experience. Then separate those capabilities from latency, availability, retention, and scale constraints. This prevents you from choosing a database before understanding the access pattern.",
			},
			{
				id: "requirements-checkpoint",
				kind: "checkpoint",
				title: "Check your framing",
				body: "Recall the distinction before estimating load.",
				questionId: "system-design-requirements",
			},
			{
				id: "estimation",
				kind: "concept",
				title: "Make the read path visible",
				body: "Estimate daily writes, redirect reads, peak QPS, record size, and retention. A large read-to-write ratio suggests a cache on the redirect path; record growth tells you when partitioning and retention policies matter.",
			},
			{
				id: "capacity-challenge",
				kind: "challenge",
				title: "Turn numbers into decisions",
				body: "Explain which numbers move the architecture and why.",
				questionId: "system-design-written",
			},
			{
				id: "architecture",
				kind: "concept",
				title: "Build the smallest credible system",
				body: "Start with a create API, a durable short-code mapping store, and a redirect service. Add a cache for hot reads, asynchronous analytics so redirects stay fast, and replication only where the availability target requires it. Name the failure and consistency trade-off every time you add a piece.",
			},
		],
		assessmentQuestionIds: [
			"system-design-choice",
			"system-design-code",
			"system-design-requirements",
		],
	},
	{
		id: "sliding-window",
		title: "Master the Sliding Window",
		summary:
			"Recognize, derive, and implement the invariant behind a common hard-problem pattern.",
		outcomes: [
			"Recognize when a contiguous range suggests a window.",
			"State the invariant before coding.",
			"Prove linear time with an amortized pointer argument.",
		],
		lessons: [
			{
				id: "recognition",
				kind: "concept",
				title: "Look for a contiguous range",
				body: "A sliding window is often a fit when the question asks about a substring or subarray and a property can be updated as one boundary moves. First decide whether the property is fixed-size, at-most, at-least, or exactly constrained.",
			},
			{
				id: "invariant-checkpoint",
				kind: "checkpoint",
				title: "Name the invariant",
				body: "A correct window needs a condition you can restore after each expansion.",
				questionId: "algorithms-window-invariant",
			},
			{
				id: "proof",
				kind: "concept",
				title: "Prove the nested loop is linear",
				body: "Do not count loop nesting. Count pointer motion across the full input. If neither pointer moves backward, each can cross the input once, producing O(n) total work.",
			},
			{
				id: "implementation-challenge",
				kind: "challenge",
				title: "Implement the pattern",
				body: "Use a last-seen map and make the left-boundary edge case explicit.",
				questionId: "algorithms-window-code",
			},
		],
		assessmentQuestionIds: [
			"algorithms-window-choice",
			"algorithms-window-written",
			"algorithms-window-code",
		],
	},
];

const questionById = new Map(
	questions.map((question) => [question.id, question]),
);
const courseById = new Map(courses.map((course) => [course.id, course]));

export function getStudySession(input: {
	date: string;
	attempt: number;
}): Effect.Effect<StudySessionPublic, never> {
	const questionIds = _selectQuestionIds(input.date, input.attempt);

	return Effect.succeed({
		id: `${input.date}:${input.attempt}`,
		label: input.attempt === 0 ? "Daily Focus" : "Practice Set",
		questions: questionIds.map((id) => _toPublic(_getQuestionOrDie(id))),
	});
}

export function revealStudyQuestion(
	questionId: string,
): Effect.Effect<StudyAnswerFeedback, StudyQuestionNotFound> {
	return Effect.gen(function* () {
		const question = yield* _findQuestion(questionId);

		if (question.kind === "flashcard") return _feedbackForFlashcard(question);
		if (question.kind === "multiple-choice")
			return _feedbackForChoice(question, false);

		return _feedbackForWrittenAnswer(question);
	});
}

export function evaluateStudyAnswer(input: {
	questionId: string;
	answer: string;
}): Effect.Effect<StudyAnswerFeedback, StudyQuestionNotFound> {
	return Effect.gen(function* () {
		const question = yield* _findQuestion(input.questionId);

		if (question.kind === "multiple-choice")
			return _feedbackForChoice(
				question,
				input.answer === question.correctOptionId,
			);
		if (question.kind === "flashcard") return _feedbackForFlashcard(question);

		return _feedbackForWrittenAnswer(question);
	});
}

export function getStudyCatalog(): Effect.Effect<
	readonly StudyCourseSummary[],
	never
> {
	return Effect.succeed(
		courses.map((course) => ({
			id: course.id,
			title: course.title,
			summary: course.summary,
			outcomes: course.outcomes,
			lessonCount: course.lessons.length,
		})),
	);
}

export function getStudyCourse(
	courseId: string,
): Effect.Effect<StudyCoursePublic, StudyCourseNotFound> {
	return Effect.gen(function* () {
		const course = yield* _findCourse(courseId);

		return {
			...course,
			lessons: course.lessons.map((lesson) => {
				if (lesson.kind === "concept") return lesson;

				const question = _getQuestionOrDie(lesson.questionId);
				return {
					id: lesson.id,
					kind: lesson.kind,
					title: lesson.title,
					body: lesson.body,
					question: _toPublic(question),
				};
			}),
			assessment: course.assessmentQuestionIds.map((questionId) =>
				_toPublic(_getQuestionOrDie(questionId)),
			),
		};
	});
}

function _findQuestion(
	questionId: string,
): Effect.Effect<StudyQuestion, StudyQuestionNotFound> {
	const question = questionById.get(questionId);
	return question
		? Effect.succeed(question)
		: Effect.fail(new StudyQuestionNotFound({ questionId }));
}

function _findCourse(
	courseId: string,
): Effect.Effect<StudyCourse, StudyCourseNotFound> {
	const course = courseById.get(courseId);
	return course
		? Effect.succeed(course)
		: Effect.fail(new StudyCourseNotFound({ courseId }));
}

function _getQuestionOrDie(questionId: string): StudyQuestion {
	const question = questionById.get(questionId);
	if (!question) throw new Error(`Missing study question: ${questionId}`);
	return question;
}

function _toPublic(question: StudyQuestion): StudyQuestionPublic {
	if (question.kind === "flashcard") {
		const {
			answer: _answer,
			explanation: _explanation,
			...publicQuestion
		} = question;
		return publicQuestion;
	}

	if (question.kind === "multiple-choice") {
		const {
			correctOptionId: _correctOptionId,
			explanation: _explanation,
			...publicQuestion
		} = question;
		return publicQuestion;
	}

	const {
		referenceAnswer: _referenceAnswer,
		rubric: _rubric,
		explanation: _explanation,
		...publicQuestion
	} = question;
	return publicQuestion;
}

function _feedbackForWrittenAnswer(
	question: Exclude<StudyQuestion, MultipleChoiceQuestion | FlashcardQuestion>,
): StudyAnswerFeedback {
	return {
		questionId: question.id,
		kind: question.kind,
		correct: null,
		answer: question.referenceAnswer,
		explanation: question.explanation,
		rubric: question.rubric,
	};
}

function _feedbackForFlashcard(
	question: FlashcardQuestion,
): StudyAnswerFeedback {
	return {
		questionId: question.id,
		kind: question.kind,
		correct: null,
		answer: question.answer,
		explanation: question.explanation,
		rubric: [],
	};
}

function _feedbackForChoice(
	question: MultipleChoiceQuestion,
	correct: boolean,
): StudyAnswerFeedback {
	const correctOption = question.options.find(
		(option) => option.id === question.correctOptionId,
	);

	return {
		questionId: question.id,
		kind: question.kind,
		correct,
		answer: correctOption?.label ?? "",
		explanation: question.explanation,
		rubric: [],
	};
}

function _selectQuestionIds(date: string, attempt: number): readonly string[] {
	const seed = _hash(`${date}:${attempt}`);

	return topics.flatMap((topic, topicIndex) => {
		const firstKind = kinds[(seed + topicIndex) % kinds.length];
		const secondKind = kinds[(seed + topicIndex + 2) % kinds.length];

		return [
			_getQuestionByTopicAndKind(topic, firstKind).id,
			_getQuestionByTopicAndKind(topic, secondKind).id,
		];
	});
}

function _getQuestionByTopicAndKind(
	topic: StudyTopic,
	kind: StudyQuestionKind,
): StudyQuestion {
	const question = questions.find(
		(candidate) => candidate.topic === topic && candidate.kind === kind,
	);

	if (!question) throw new Error(`Missing ${kind} question for ${topic}`);
	return question;
}

function _hash(value: string): number {
	let hash = 2_166_136_261;

	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16_777_619);
	}

	return hash >>> 0;
}
