import { Data, Effect } from "effect";

export type InterviewTrack = "coding" | "system-design";

export type ResponseField =
	| "plan"
	| "code"
	| "checks"
	| "scope"
	| "estimates"
	| "architecture"
	| "tradeoffs"
	| "rolloutMetrics";

type InterviewRehearsal = {
	id: string;
	track: InterviewTrack;
	title: string;
	summary: string;
	durationMinutes: number;
	prompt: string;
	clarifyingQuestions: readonly string[];
	responseFields: readonly ResponseField[];
	seniorFollowUps: readonly string[];
	guide: {
		answer: string;
		checklist: readonly string[];
		commonMisses: readonly string[];
	};
};

export type InterviewRehearsalPublic = Omit<InterviewRehearsal, "guide">;

export type InterviewGuide = InterviewRehearsal["guide"] & {
	rehearsalId: string;
};

export type CurrentBriefing = {
	id: string;
	title: string;
	question: string;
	answer: string;
	whyItMatters: string;
	sourceName: string;
	sourceUrl: string;
	checkedOn: string;
};

export type InterviewNumber = {
	id: string;
	category: "capacity" | "latency" | "network" | "judgment";
	title: string;
	number: string;
	context: string;
	whyItMatters: string;
	sourceName: string;
	sourceUrl: string;
	checkedOn: string;
};

export class InterviewRehearsalNotFound extends Data.TaggedError(
	"InterviewRehearsalNotFound",
)<{ rehearsalId: string }> {}

const codingFields = ["plan", "code", "checks"] as const;
const designFields = [
	"scope",
	"estimates",
	"architecture",
	"tradeoffs",
	"rolloutMetrics",
] as const;

const rehearsals: readonly InterviewRehearsal[] = [
	{
		id: "two-sum",
		track: "coding",
		title: "Two Sum",
		summary: "Find two values that add to a target.",
		durationMinutes: 35,
		prompt:
			"Given an array of integers and a target, return the indexes of two different values that add to the target. There is one answer.",
		clarifyingQuestions: [
			"May the input contain negative values?",
			"May I use extra memory to make the lookup fast?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"What changes if the input arrives as a stream?",
			"What would you test before shipping this helper?",
		],
		guide: {
			answer:
				"Walk left to right. For each value, look for target minus that value in a map of values already seen. If it is there, return its saved index and the current index. Otherwise save the current value and index.",
			checklist: [
				"Uses a map from value to index.",
				"Looks before adding the current value.",
				"Explains O(n) time and O(n) memory.",
			],
			commonMisses: [
				"Using the same value twice when only one copy exists.",
				"Starting with a nested loop without naming its O(n²) cost.",
			],
		},
	},
	{
		id: "valid-parentheses",
		track: "coding",
		title: "Valid Parentheses",
		summary: "Check whether brackets close in the right order.",
		durationMinutes: 30,
		prompt:
			"Given a string made of (), {}, and [], return whether every opening bracket closes with the right kind of bracket in the right order.",
		clarifyingQuestions: [
			"Can the string contain other characters?",
			"What should an empty string return?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would you return the first bad position?",
			"What test cases catch most stack mistakes?",
		],
		guide: {
			answer:
				"Push opening brackets onto a stack. For each closing bracket, pop the stack and check that it is its matching opener. The string is valid only when every check passes and the stack ends empty.",
			checklist: [
				"Uses a stack.",
				"Rejects a closing bracket when the stack is empty.",
				"Checks that the stack is empty at the end.",
			],
			commonMisses: ["Forgetting the final empty-stack check."],
		},
	},
	{
		id: "longest-unique-substring",
		track: "coding",
		title: "Longest Substring Without Repeating Characters",
		summary: "Use a moving window to find the longest unique slice.",
		durationMinutes: 40,
		prompt:
			"Return the length of the longest part of a string that has no repeated character. For abcabcbb, return 3.",
		clarifyingQuestions: [
			"Do we count characters or bytes?",
			"May the input be empty?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"Why is this O(n) even though it has a loop inside a loop?",
			"How would Unicode change the definition of a character?",
		],
		guide: {
			answer:
				"Keep the left edge of the current unique slice and a map of each character's most recent index. When a repeated character appears inside the slice, move the left edge just past its old index. Update the best length after each step.",
			checklist: [
				"Keeps the left edge from moving backward.",
				"Checks that an old index is still inside the current slice.",
				"Explains O(n) time and O(min(n, alphabet)) memory.",
			],
			commonMisses: ["Moving the left edge backward after an old repeat."],
		},
	},
	{
		id: "merge-intervals",
		track: "coding",
		title: "Merge Intervals",
		summary: "Sort ranges, then combine overlaps.",
		durationMinutes: 35,
		prompt:
			"Given time ranges [start, end], merge every pair that overlaps and return the remaining ranges in order.",
		clarifyingQuestions: [
			"Do touching ranges such as [1, 2] and [2, 3] count as one range?",
			"May I sort the input in place?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would you merge ranges that arrive over time?",
			"What contract would prevent time-zone errors?",
		],
		guide: {
			answer:
				"Sort by start time. Keep one output range. If the next range starts before the current output ends, extend the output end. Otherwise add a new output range.",
			checklist: [
				"Sorts before merging.",
				"Uses the maximum end when ranges overlap.",
				"Explains O(n log n) time from sorting.",
			],
			commonMisses: ["Comparing every range with every other range."],
		},
	},
	{
		id: "rotated-binary-search",
		track: "coding",
		title: "Search in Rotated Sorted Array",
		summary: "Use binary search when one half is still ordered.",
		durationMinutes: 40,
		prompt:
			"A sorted array of distinct integers has been rotated. Return the target index, or -1 if it is absent, in O(log n) time.",
		clarifyingQuestions: ["Are values distinct?", "Can the array be empty?"],
		responseFields: codingFields,
		seniorFollowUps: [
			"What changes when values may repeat?",
			"How would you explain the loop rule to another engineer?",
		],
		guide: {
			answer:
				"At each step, one side from the midpoint is ordered. Decide whether the target lies in that ordered side. Keep that side when it does; otherwise search the other side. Repeat until the range is empty.",
			checklist: [
				"Identifies the ordered half at every step.",
				"Checks whether the target lies inside that half.",
				"Keeps O(log n) time.",
			],
			commonMisses: ["Assuming the left half is always ordered."],
		},
	},
	{
		id: "reverse-linked-list",
		track: "coding",
		title: "Reverse Linked List",
		summary: "Reverse links without losing the rest of the list.",
		durationMinutes: 30,
		prompt: "Reverse a singly linked list and return its new head.",
		clarifyingQuestions: [
			"Can the list be empty?",
			"Must I change the list in place?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would you reverse only a section of the list?",
			"Which pointer must you save before changing a link?",
		],
		guide: {
			answer:
				"Keep previous and current pointers. Save current.next, point current.next at previous, then move previous and current forward. Previous is the new head when current reaches null.",
			checklist: [
				"Saves the next node before overwriting it.",
				"Handles an empty or one-node list.",
				"Uses O(1) extra memory.",
			],
			commonMisses: ["Overwriting next before saving it."],
		},
	},
	{
		id: "tree-level-order",
		track: "coding",
		title: "Binary Tree Level Order Traversal",
		summary: "Visit a tree one level at a time.",
		durationMinutes: 35,
		prompt:
			"Return a binary tree's values as arrays of levels, starting at the root.",
		clarifyingQuestions: [
			"What should an empty tree return?",
			"Does left-to-right order within a level matter?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would you avoid slow array shifts in JavaScript?",
			"When would depth-first search be a better fit?",
		],
		guide: {
			answer:
				"Use a queue. For each level, remember the queue length, remove exactly that many nodes, add their values to one row, then enqueue their children.",
			checklist: [
				"Uses a queue.",
				"Captures the level size before processing it.",
				"Explains O(n) time.",
			],
			commonMisses: [
				"Mixing children from the next level into the current row.",
			],
		},
	},
	{
		id: "number-of-islands",
		track: "coding",
		title: "Number of Islands",
		summary: "Count connected land with a graph walk.",
		durationMinutes: 40,
		prompt:
			"Given a grid of land and water, count how many separate land groups it contains. Land connects only up, down, left, and right.",
		clarifyingQuestions: [
			"May I change the input grid?",
			"Can the grid be empty or uneven?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would this change for a grid too large for one machine?",
			"When would breadth-first search be safer than recursive depth-first search?",
		],
		guide: {
			answer:
				"Scan every cell. When you find unvisited land, add one to the count and visit every land neighbor with depth-first or breadth-first search. Mark each visited cell so you do not count it twice.",
			checklist: [
				"Visits every connected neighbor.",
				"Marks land as visited.",
				"Explains O(rows × columns) time.",
			],
			commonMisses: [
				"Counting each land cell instead of each connected group.",
			],
		},
	},
	{
		id: "course-schedule",
		track: "coding",
		title: "Course Schedule",
		summary: "Decide whether dependency rules contain a cycle.",
		durationMinutes: 45,
		prompt:
			"Given courses and prerequisite pairs, return whether you can finish every course.",
		clarifyingQuestions: [
			"Can a pair appear more than once?",
			"Do we only need yes or no, or also an order?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would you return one cycle for debugging?",
			"How would you update the answer after one new dependency arrives?",
		],
		guide: {
			answer:
				"Build a directed graph and count each course's incoming prerequisites. Start with courses that have none. Remove their outgoing edges and add newly clear courses to the queue. You can finish all courses only if you remove all of them.",
			checklist: [
				"Builds outgoing edges and incoming counts.",
				"Starts with courses that have no prerequisites.",
				"Uses the processed count to detect a cycle.",
			],
			commonMisses: [
				"Reversing the prerequisite edge without updating the rest of the plan.",
			],
		},
	},
	{
		id: "coin-change",
		track: "coding",
		title: "Coin Change",
		summary: "Build the best answer from smaller amounts.",
		durationMinutes: 45,
		prompt:
			"Given coin values and an amount, return the fewest coins needed to make that amount, or -1 if it cannot be made.",
		clarifyingQuestions: [
			"Are coin values positive integers?",
			"How large can the amount be?",
		],
		responseFields: codingFields,
		seniorFollowUps: [
			"How would you return the coins themselves?",
			"Why does a greedy choice fail for some coin sets?",
		],
		guide: {
			answer:
				"Make an array where entry i means the fewest coins for amount i. Start amount 0 at zero and all other entries as unreachable. For each amount, try each coin and keep one plus the best smaller amount.",
			checklist: [
				"Defines one clear meaning for each table entry.",
				"Handles unreachable amounts.",
				"Explains O(amount × number of coins) time.",
			],
			commonMisses: ["Using greedy choice without proving it works."],
		},
	},
	{
		id: "url-shortener",
		track: "system-design",
		title: "URL Shortener",
		summary: "Create short links and send readers to the right destination.",
		durationMinutes: 50,
		prompt:
			"Design a service like Bitly. People create short links and later open a short link to reach the full URL.",
		clarifyingQuestions: [
			"Do links expire or support custom names?",
			"What read-to-write ratio should we expect?",
			"Do we need click analytics on the redirect path?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How would you move from one data store to another without broken links?",
			"Which metrics tell you a cache is helping?",
		],
		guide: {
			answer:
				"Start with link creation, a durable mapping from code to URL, and a fast redirect read path. Use a cache for popular mappings and send click events to a queue so analytics does not slow redirects. Choose code generation that avoids collisions and gives enough space for growth.",
			checklist: [
				"States link creation and redirect use cases.",
				"Separates the fast redirect path from analytics.",
				"Explains cache misses, code collisions, and link deletion.",
				"Names rollout and cache metrics.",
			],
			commonMisses: ["Adding shards before estimating reads and storage."],
		},
	},
	{
		id: "rate-limiter",
		track: "system-design",
		title: "Rate Limiter",
		summary: "Limit harmful traffic without blocking normal use.",
		durationMinutes: 45,
		prompt:
			"Design a rate limiter for a public API. It must enforce limits per customer and return a useful answer when a request is blocked.",
		clarifyingQuestions: [
			"Which key defines a customer: user, API key, or IP address?",
			"Do limits differ by endpoint or plan?",
			"How much short burst traffic may a customer use?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How do you keep limit counts correct across regions?",
			"What happens if the limiter store is down?",
		],
		guide: {
			answer:
				"Put the limiter near the API edge. Keep a small counter or token record per customer and rule. A token bucket allows controlled bursts while keeping an average limit. Return 429 with retry information. Decide whether to fail open or closed when the count store fails.",
			checklist: [
				"Defines the limit key and policy.",
				"Chooses an algorithm and explains bursts.",
				"Covers distributed counts and failure behavior.",
			],
			commonMisses: [
				"Treating every request equally when plans have different limits.",
			],
		},
	},
	{
		id: "news-feed",
		track: "system-design",
		title: "News Feed",
		summary: "Show each user a timely, ranked list of posts.",
		durationMinutes: 55,
		prompt:
			"Design a social news feed. A person posts, follows others, and sees a ranked feed of recent posts.",
		clarifyingQuestions: [
			"Do we need a simple time order or a ranked feed?",
			"How many followers can one account have?",
			"How fresh must a new post be?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How do you handle a celebrity with millions of followers?",
			"How would you test a new ranking rule safely?",
		],
		guide: {
			answer:
				"Store posts and follow edges separately. For common accounts, write a post ID into follower feed inboxes when it is created. For very large accounts, read their posts at feed time instead. Fetch candidate posts, rank them, then cache short feed pages.",
			checklist: [
				"Separates post storage, follow graph, and feed serving.",
				"Explains write fan-out and read fan-out.",
				"Handles large accounts and ranking experiments.",
			],
			commonMisses: ["Using one fan-out plan for every account size."],
		},
	},
	{
		id: "chat-service",
		track: "system-design",
		title: "Chat Service",
		summary:
			"Send messages quickly and keep them in order enough to be useful.",
		durationMinutes: 55,
		prompt:
			"Design one-to-one and group chat. Users need live delivery, message history, and read status.",
		clarifyingQuestions: [
			"What order must messages keep: per conversation or globally?",
			"How long should history remain?",
			"Must messages work when a recipient is offline?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How do you avoid duplicate delivery after reconnecting?",
			"How would you move one busy chat to another shard?",
		],
		guide: {
			answer:
				"Keep long-lived client connections on chat gateways. Route each conversation to one ordered log partition. Save messages durably before delivery, push them to online users, and keep an inbox or cursor for offline catch-up. Treat read status as separate, smaller events.",
			checklist: [
				"Defines ordering scope.",
				"Separates live delivery from durable history.",
				"Covers reconnect, duplicate, and offline behavior.",
			],
			commonMisses: ["Promising global message order without a need for it."],
		},
	},
	{
		id: "file-sync",
		track: "system-design",
		title: "File Storage and Sync",
		summary: "Store files, share them, and keep devices in step.",
		durationMinutes: 55,
		prompt:
			"Design a service like Dropbox. Users upload files, see them on several devices, and may share folders.",
		clarifyingQuestions: [
			"What file size range matters?",
			"Do we need offline edits and conflict handling?",
			"How fast must another device see a change?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How would you migrate stored file chunks?",
			"Which data should never appear in logs?",
		],
		guide: {
			answer:
				"Keep file bytes in object storage and file names, folders, versions, and access rules in metadata storage. Upload large files as chunks. Write a version record, then publish a change event for device sync. Use version IDs to detect conflicts instead of silently overwriting edits.",
			checklist: [
				"Separates bytes from metadata.",
				"Uses versions and change events for sync.",
				"Covers access control, conflicts, and deletion.",
			],
			commonMisses: [
				"Putting large file bytes in the same store as folder metadata.",
			],
		},
	},
	{
		id: "notifications",
		track: "system-design",
		title: "Notification Platform",
		summary:
			"Send the right message on the right channel without spamming people.",
		durationMinutes: 50,
		prompt:
			"Design a platform that sends email, push, and text notifications for many product teams.",
		clarifyingQuestions: [
			"Which channels are required?",
			"How do users set quiet hours and channel choices?",
			"What delivery guarantee do product teams need?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How do you stop one broken provider from delaying all sends?",
			"How do you prove a user did not receive the same alert twice?",
		],
		guide: {
			answer:
				"Accept a notification request, validate it, then place one job on a durable queue. A policy service checks user choices and rate limits. Channel workers send through providers, record the result, and retry safe failures with an idempotency key.",
			checklist: [
				"Separates product requests, policy, queueing, and delivery.",
				"Handles user choices, retries, and duplicates.",
				"Names delivery and queue-delay metrics.",
			],
			commonMisses: ["Retrying every failure without an idempotency key."],
		},
	},
	{
		id: "job-scheduler",
		track: "system-design",
		title: "Job Scheduler",
		summary: "Run work at the right time and recover when workers fail.",
		durationMinutes: 50,
		prompt:
			"Design a service that runs one-time and repeating background jobs for many teams.",
		clarifyingQuestions: [
			"How accurate must start time be?",
			"May the same job run more than once after a failure?",
			"How long can a job run?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How would you handle a daylight-saving time change?",
			"How do you stop a tenant from filling the queue?",
		],
		guide: {
			answer:
				"Store job definitions and next run times. Scheduler workers claim due jobs with a lease, put executions on a queue, and calculate the next run. Execution workers report success or failure. Use idempotency and a visible run history because retries can run work more than once.",
			checklist: [
				"Separates scheduling from execution.",
				"Uses leases or atomic claims.",
				"Covers retry, missed runs, and tenant limits.",
			],
			commonMisses: [
				"Assuming a worker will never crash after claiming a job.",
			],
		},
	},
	{
		id: "metrics-platform",
		track: "system-design",
		title: "Metrics and Logging Platform",
		summary:
			"Collect high-volume events and make them useful during an incident.",
		durationMinutes: 55,
		prompt:
			"Design a platform that ingests application metrics and logs, stores them, and lets engineers search and alert on them.",
		clarifyingQuestions: [
			"What event volume and retention period matter?",
			"Which queries need seconds and which can take longer?",
			"How much data loss is acceptable during an outage?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How would you control expensive, high-cardinality labels?",
			"What data must be scrubbed before it reaches storage?",
		],
		guide: {
			answer:
				"Send events through a durable ingestion layer that can absorb bursts. Validate and scrub data, then route logs and metrics to stores built for their query patterns. Keep recent data fast and older data cheap. Build alerts from stored or streaming aggregates.",
			checklist: [
				"Separates ingest, processing, storage, and query paths.",
				"Covers retention, sampling, and expensive labels.",
				"Names data-loss and query-latency limits.",
			],
			commonMisses: [
				"Treating logs and time-series metrics as the same query problem.",
			],
		},
	},
	{
		id: "collaborative-editor",
		track: "system-design",
		title: "Collaborative Document Editor",
		summary: "Let several people edit one document at the same time.",
		durationMinutes: 60,
		prompt:
			"Design a shared document editor. Several people can edit at once, see each other's changes, and return to old versions.",
		clarifyingQuestions: [
			"Must every edit appear in the same order for all users?",
			"How many active editors may one document have?",
			"Do we need offline edits?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How do you change the edit protocol without breaking open clients?",
			"What would you measure to find sync lag?",
		],
		guide: {
			answer:
				"Keep an ordered stream of edits for each document and send edits over long-lived connections. Give each edit an operation ID and version. A collaboration service resolves concurrent changes with an agreed algorithm, saves snapshots, and lets new clients load a snapshot plus later edits.",
			checklist: [
				"Defines order and conflict behavior.",
				"Uses a document stream plus snapshots.",
				"Covers reconnect, offline edits, and protocol changes.",
			],
			commonMisses: ["Saying 'real time' without defining conflict rules."],
		},
	},
	{
		id: "feature-flags",
		track: "system-design",
		title: "Feature Flags and Experiments",
		summary: "Change product behavior safely and measure the result.",
		durationMinutes: 55,
		prompt:
			"Design a feature-flag and experiment platform used by many services. Teams need rules, gradual rollout, fast evaluation, and experiment results.",
		clarifyingQuestions: [
			"Must a flag change reach users immediately?",
			"Which user traits may a rule use?",
			"What must happen if the flag service is unavailable?",
		],
		responseFields: designFields,
		seniorFollowUps: [
			"How do you remove old flags without breaking clients?",
			"How do you keep experiment assignment stable across devices?",
		],
		guide: {
			answer:
				"Store flags, rules, and versions in a control plane. Publish signed or versioned snapshots to services so evaluation happens locally and stays fast. Use a stable hash of user and experiment IDs for assignment. Record exposures separately from evaluation and give every flag a safe default.",
			checklist: [
				"Separates flag management from local evaluation.",
				"Uses stable assignment and safe defaults.",
				"Covers stale data, cleanup, and exposure events.",
			],
			commonMisses: ["Calling a central service on every request."],
		},
	},
];

const briefings: readonly CurrentBriefing[] = [
	{
		id: "http-stale-while-revalidate",
		title: "Serving a stale response while refreshing it",
		question: "What does stale-while-revalidate let a cache do?",
		answer:
			"It may serve a response that has just become stale while it asks the origin for a fresh one. Later requests can receive the refreshed response.",
		whyItMatters:
			"It can reduce wait time for read-heavy pages, but you must decide how old a response may be for the product.",
		sourceName: "RFC 5861",
		sourceUrl: "https://www.rfc-editor.org/rfc/rfc5861",
		checkedOn: "2026-07-21",
	},
	{
		id: "sqs-duplicates",
		title: "Queue consumers must handle repeats",
		question: "Why should a queue consumer use an idempotency key?",
		answer:
			"A standard Amazon SQS queue can deliver a message more than once. An idempotency key lets the consumer make the second delivery safe.",
		whyItMatters:
			"It prevents a retry from creating two charges, emails, or account changes.",
		sourceName: "Amazon SQS developer guide",
		sourceUrl:
			"https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html",
		checkedOn: "2026-07-21",
	},
	{
		id: "server-function-auth",
		title: "The route guard is not the data guard",
		question: "Where should a private server function check authentication?",
		answer:
			"The server function itself must check authentication. A route guard improves the page flow, but someone can still call the server endpoint directly.",
		whyItMatters:
			"It keeps private data private when the user bypasses the page that normally calls the function.",
		sourceName: "TanStack Start server functions",
		sourceUrl:
			"https://tanstack.com/start/latest/docs/framework/react/guide/server-functions",
		checkedOn: "2026-07-21",
	},
	{
		id: "postgres-indexes",
		title: "An index speeds reads but costs writes",
		question: "What trade-off comes with adding a database index?",
		answer:
			"An index can make matching reads faster, but the database must also create and update it when rows change. It takes storage and can slow writes.",
		whyItMatters:
			"A staff-level answer names the read gain and the write cost before recommending an index.",
		sourceName: "PostgreSQL documentation",
		sourceUrl: "https://www.postgresql.org/docs/current/indexes-intro.html",
		checkedOn: "2026-07-21",
	},
];

const interviewNumbers: readonly InterviewNumber[] = [
	{
		id: "ebs-volume-size",
		category: "capacity",
		title: "One EBS volume can be large",
		number: "Up to 64 TiB",
		context:
			"Amazon EBS supports volumes up to 64 TiB for supported volume types, partition schemes, operating systems, and file systems.",
		whyItMatters:
			"Do the capacity math before you split data across shards. A large data set alone does not prove that one machine has run out of room.",
		sourceName: "Amazon EBS volume constraints",
		sourceUrl:
			"https://docs.aws.amazon.com/ebs/latest/userguide/volume_constraints.html",
		checkedOn: "2026-07-22",
	},
	{
		id: "same-az-latency",
		category: "latency",
		title: "Calls inside one availability zone",
		number: "Usually less than 1 ms",
		context:
			"AWS says round trips between EC2 instances in one availability zone are normally below 1 ms when they use enhanced networking.",
		whyItMatters:
			"Keep the tightest request path in one zone when you need low latency. This does not protect you from a zone outage.",
		sourceName: "AWS Architecture Blog",
		sourceUrl:
			"https://aws.amazon.com/blogs/architecture/improving-performance-and-reducing-cost-using-availability-zone-affinity/",
		checkedOn: "2026-07-22",
	},
	{
		id: "cross-az-latency",
		category: "latency",
		title: "Calls across availability zones",
		number: "Usually single-digit ms",
		context:
			"AWS describes round trips across availability zones in one region as generally taking single-digit milliseconds.",
		whyItMatters:
			"Multi-zone replication improves resilience, but it adds time and often transfer cost. Name both trade-offs in an interview.",
		sourceName: "AWS Architecture Blog",
		sourceUrl:
			"https://aws.amazon.com/blogs/architecture/improving-performance-and-reducing-cost-using-availability-zone-affinity/",
		checkedOn: "2026-07-22",
	},
	{
		id: "availability-zone-distance",
		category: "latency",
		title: "Availability zones are close, not co-located",
		number: "Up to about 100 km apart",
		context:
			"AWS says availability zones sit within roughly 100 km (60 miles) of one another and use high-bandwidth, low-latency links.",
		whyItMatters:
			"You can use synchronous replication across zones for many workloads, but you should still set a latency and recovery target first.",
		sourceName: "AWS fault isolation boundaries",
		sourceUrl:
			"https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/availability-zones.html",
		checkedOn: "2026-07-22",
	},
	{
		id: "gigabits-to-bytes",
		category: "network",
		title: "Convert a network rate before you size it",
		number: "1 Gbps = 125 MB/s",
		context:
			"Network rates use bits. Divide gigabits per second by eight to get gigabytes per second: 25 Gbps is 3.125 GB/s before protocol overhead.",
		whyItMatters:
			"This lets you check whether a data transfer can finish inside its time budget instead of saying that a link sounds fast.",
		sourceName: "NIST SI prefixes",
		sourceUrl: "https://www.nist.gov/pml/owm/metric-si/si-units",
		checkedOn: "2026-07-22",
	},
	{
		id: "measure-before-sharding",
		category: "judgment",
		title: "A number should lead to a limit",
		number: "Name the measured bottleneck",
		context:
			"Before proposing shards, state the storage, write rate, recovery time, or latency limit that one database can no longer meet.",
		whyItMatters:
			"Senior and staff answers connect a new component to a real limit. They do not add distributed systems work just because the data set is big.",
		sourceName: "Hello Interview: Numbers to Know",
		sourceUrl:
			"https://www.hellointerview.com/learn/system-design/core-concepts/numbers-to-know",
		checkedOn: "2026-07-22",
	},
];

const rehearsalById = new Map(rehearsals.map((item) => [item.id, item]));

export function getInterviewCatalog(): Effect.Effect<
	readonly InterviewRehearsalPublic[],
	never
> {
	return Effect.succeed(rehearsals.map(_toPublic));
}

export function getInterviewRehearsal(
	rehearsalId: string,
): Effect.Effect<InterviewRehearsalPublic, InterviewRehearsalNotFound> {
	return _getRehearsal(rehearsalId).pipe(Effect.map(_toPublic));
}

export function getInterviewGuide(
	rehearsalId: string,
): Effect.Effect<InterviewGuide, InterviewRehearsalNotFound> {
	return _getRehearsal(rehearsalId).pipe(
		Effect.map((rehearsal) => ({
			rehearsalId: rehearsal.id,
			...rehearsal.guide,
		})),
	);
}

export function getCurrentBriefings(): Effect.Effect<
	readonly CurrentBriefing[],
	never
> {
	return Effect.succeed(briefings);
}

export function getInterviewNumbers(): Effect.Effect<
	readonly InterviewNumber[],
	never
> {
	return Effect.succeed(interviewNumbers);
}

function _getRehearsal(
	rehearsalId: string,
): Effect.Effect<InterviewRehearsal, InterviewRehearsalNotFound> {
	const rehearsal = rehearsalById.get(rehearsalId);
	return rehearsal
		? Effect.succeed(rehearsal)
		: Effect.fail(new InterviewRehearsalNotFound({ rehearsalId }));
}

function _toPublic(rehearsal: InterviewRehearsal): InterviewRehearsalPublic {
	const { guide: _guide, ...publicRehearsal } = rehearsal;
	return publicRehearsal;
}
