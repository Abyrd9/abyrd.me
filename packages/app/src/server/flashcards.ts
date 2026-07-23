import { Effect } from "effect";

export type SystemTermCard = {
	id: string;
	term: string;
	category: "concept";
	definition: string;
	whyItMatters: string;
	example: string;
};

type SystemTerm = Omit<SystemTermCard, "category">;

export type ArchitecturePatternCard = {
	id: string;
	title: string;
	category: "architecture-pattern";
	description: string;
	solves: string;
	useWhen: string;
	tradeoff: string;
	example: string;
};

export type AlgorithmCard = {
	heading: string;
	body: string;
	code?: string;
	language?: "TypeScript" | "Go";
};

export type AlgorithmDeck = {
	id: string;
	title: string;
	summary: string;
	cards: readonly AlgorithmCard[];
};

export type FlashcardDecks = {
	systemTerms: readonly SystemTermCard[];
	architecturePatterns: readonly ArchitecturePatternCard[];
	algorithms: readonly AlgorithmDeck[];
};

const systemTerms: readonly SystemTerm[] = [
	{
		id: "cache",
		term: "Cache",
		definition:
			"A cache keeps a copy of data that costs time or money to fetch again.",
		whyItMatters:
			"It can make common reads faster and reduce work on the main database or service.",
		example:
			"Store a user's profile for five minutes after the first database read.",
	},
	{
		id: "cdn",
		term: "CDN",
		definition:
			"A content delivery network stores static files near users around the world.",
		whyItMatters:
			"It shortens the trip for images, scripts, and videos while reducing traffic to your origin server.",
		example:
			"Serve a product image from a nearby edge location instead of one server in Virginia.",
	},
	{
		id: "load-balancer",
		term: "Load balancer",
		definition: "A load balancer sends incoming requests to healthy servers.",
		whyItMatters:
			"It spreads work, lets you add servers, and keeps one failed server from taking all traffic.",
		example:
			"Send each web request to the least busy healthy application server.",
	},
	{
		id: "queue",
		term: "Queue",
		definition: "A queue stores work until another service can handle it.",
		whyItMatters:
			"It absorbs bursts and lets slow work happen outside the user's request.",
		example: "Put an image-resize job on a queue after a user uploads a photo.",
	},
	{
		id: "idempotency",
		term: "Idempotency",
		definition:
			"An action is idempotent when repeating the same request has the same final result as doing it once.",
		whyItMatters:
			"Retries are normal. Idempotency stops a retry from creating two payments, orders, or emails.",
		example:
			"Save a payment request under an idempotency key and return the saved result on a retry.",
	},
	{
		id: "rate-limiter",
		term: "Rate limiter",
		definition:
			"A rate limiter restricts how often one client can perform an action.",
		whyItMatters:
			"It protects shared systems from abuse and keeps a traffic spike from using all capacity.",
		example: "Allow one account to make 100 API requests each minute.",
	},
	{
		id: "replication",
		term: "Replication",
		definition:
			"Replication keeps copies of the same data on more than one machine or in more than one place.",
		whyItMatters:
			"It can keep data available after a machine fails and can spread read work.",
		example:
			"Write to a primary database and copy each change to two replicas in other availability zones.",
	},
	{
		id: "sharding",
		term: "Sharding",
		definition:
			"Sharding splits one data set across several databases by a chosen key.",
		whyItMatters:
			"It can increase storage and write capacity, but it makes queries, moves, and recovery harder.",
		example:
			"Store users whose IDs start with 0–3 on one shard and 4–7 on another.",
	},
	{
		id: "partitioning",
		term: "Partitioning",
		definition:
			"Partitioning divides data into smaller groups, often by time, region, or key range.",
		whyItMatters:
			"It can make large tables easier to query, keep, and remove without always requiring separate databases.",
		example:
			"Keep click events in monthly partitions and delete the oldest month after the retention period.",
	},
	{
		id: "consistency",
		term: "Consistency",
		definition:
			"Consistency describes what a read may return after a write, especially when data has copies.",
		whyItMatters:
			"The product decides whether it can show an older value or must wait until every reader sees the new one.",
		example:
			"A bank balance may need a fresh read, while a social-media like count may safely lag.",
	},
	{
		id: "backpressure",
		term: "Backpressure",
		definition:
			"Backpressure slows or rejects new work when a downstream service cannot keep up.",
		whyItMatters:
			"It prevents a slow dependency from filling memory, exhausting workers, and causing a wider failure.",
		example:
			"Stop accepting more image jobs when the queue reaches its safe limit.",
	},
	{
		id: "circuit-breaker",
		term: "Circuit breaker",
		definition:
			"A circuit breaker stops calls to a dependency that is failing, then tests it again later.",
		whyItMatters:
			"It avoids wasting threads and time on a service that cannot answer and helps the rest of the app recover.",
		example:
			"After several payment-provider timeouts, return a clear error for one minute instead of sending more calls.",
	},
];

const additionalSystemTerms: readonly SystemTerm[] = [
	{
		id: "dns",
		term: "DNS",
		definition:
			"The domain name system turns a name such as app.example.com into an address that computers can use.",
		whyItMatters:
			"It sits before most user traffic. Its cache time controls how quickly a domain change reaches users.",
		example: "Point api.example.com at a load balancer's address.",
	},
	{
		id: "reverse-proxy",
		term: "Reverse proxy",
		definition:
			"A reverse proxy receives a request on behalf of an application server and sends it to the right internal service.",
		whyItMatters:
			"It can end TLS, cache responses, compress data, and hide internal servers from the public internet.",
		example:
			"Nginx accepts HTTPS traffic and forwards it to a Node application.",
	},
	{
		id: "horizontal-scaling",
		term: "Horizontal scaling",
		definition:
			"Horizontal scaling adds more machines that perform the same work.",
		whyItMatters:
			"It can raise capacity and survive one machine failure when the service does not keep user state in one process.",
		example:
			"Run ten identical API servers behind a load balancer instead of one.",
	},
	{
		id: "vertical-scaling",
		term: "Vertical scaling",
		definition:
			"Vertical scaling gives one machine more CPU, memory, or storage.",
		whyItMatters:
			"It is often the simplest first step, but one machine has a limit and can become a single point of failure.",
		example: "Move a database from a 4-core machine to a 32-core machine.",
	},
	{
		id: "latency",
		term: "Latency",
		definition: "Latency is how long one operation takes from start to finish.",
		whyItMatters:
			"A user feels latency directly, so a design needs a target for common and slow requests.",
		example: "A search request has a p95 latency target of 200 milliseconds.",
	},
	{
		id: "throughput",
		term: "Throughput",
		definition:
			"Throughput is the amount of work a system completes in a unit of time.",
		whyItMatters:
			"It helps you size workers, databases, and network links for expected load.",
		example: "A service processes 10,000 events each second.",
	},
	{
		id: "availability",
		term: "Availability",
		definition:
			"Availability is the share of time that a system can serve a valid request.",
		whyItMatters:
			"A target such as 99.9% makes failure handling, redundancy, and planned maintenance concrete.",
		example: "A payment API aims for 99.99% availability each month.",
	},
	{
		id: "eventual-consistency",
		term: "Eventual consistency",
		definition:
			"After a write, different copies of data may disagree for a short time but later converge.",
		whyItMatters:
			"It can keep a distributed system responsive, but the product must tolerate an older read.",
		example:
			"A new profile photo may appear on one feed before it appears on another.",
	},
	{
		id: "strong-consistency",
		term: "Strong consistency",
		definition:
			"After a write succeeds, a later read returns that write or a newer value.",
		whyItMatters:
			"It simplifies important decisions such as preventing an account from spending the same balance twice.",
		example:
			"A stock trade checks the latest available shares before it completes.",
	},
	{
		id: "read-replica",
		term: "Read replica",
		definition:
			"A read replica is a copy of a database that handles read requests.",
		whyItMatters:
			"It can take read work from the primary database, but copied data may arrive late.",
		example:
			"Send product-page reads to replicas and order writes to the primary.",
	},
	{
		id: "database-index",
		term: "Database index",
		definition:
			"A database index is an extra data structure that helps the database find matching rows quickly.",
		whyItMatters:
			"It can speed a frequent query, but it uses storage and adds work to every write.",
		example: "Index user_id when most queries look up orders for one user.",
	},
	{
		id: "transaction",
		term: "Transaction",
		definition:
			"A transaction groups database changes so they either all succeed or all fail together.",
		whyItMatters:
			"It protects rules that span more than one write, such as moving money between accounts.",
		example: "Subtract from one balance and add to another in one transaction.",
	},
	{
		id: "object-storage",
		term: "Object storage",
		definition:
			"Object storage keeps files as objects with an ID and metadata instead of as rows in a database table.",
		whyItMatters:
			"It suits large, durable files and keeps file traffic away from an application's main database.",
		example: "Store uploaded videos in S3 and save only their IDs in Postgres.",
	},
	{
		id: "publish-subscribe",
		term: "Publish-subscribe",
		definition:
			"Publish-subscribe lets a producer send one event to a topic that several consumers can receive.",
		whyItMatters:
			"It lets new consumers react to an event without changing the producer.",
		example:
			"An order-created event reaches billing, email, and analytics consumers.",
	},
	{
		id: "dead-letter-queue",
		term: "Dead-letter queue",
		definition:
			"A dead-letter queue holds messages that failed too many times to process normally.",
		whyItMatters:
			"It keeps one bad message from blocking useful work and gives the team a place to inspect failures.",
		example: "Move an invalid payment event aside after five failed attempts.",
	},
	{
		id: "retry",
		term: "Retry with backoff",
		definition:
			"A retry with backoff waits longer between repeated attempts after a temporary failure.",
		whyItMatters:
			"The wait reduces the chance that many clients make an outage worse at the same time.",
		example:
			"Retry a timed-out request after 100 ms, then 200 ms, then 400 ms with some random spread.",
	},
	{
		id: "health-check",
		term: "Health check",
		definition:
			"A health check is a small request that reports whether a service can do the work assigned to it.",
		whyItMatters:
			"Load balancers and deploy tools use it to stop sending traffic to unhealthy instances.",
		example:
			"A readiness check confirms that an API has connected to its database before it receives requests.",
	},
	{
		id: "service-discovery",
		term: "Service discovery",
		definition:
			"Service discovery lets one service find the current address of another service.",
		whyItMatters:
			"It removes hard-coded addresses when containers and instances start, stop, or move.",
		example:
			"An order service asks an internal DNS name for the current payment-service instances.",
	},
	{
		id: "connection-pool",
		term: "Connection pool",
		definition:
			"A connection pool keeps a limited set of open connections ready for reuse.",
		whyItMatters:
			"It avoids the cost of opening a connection for every request and protects a database from too many clients.",
		example: "Each API instance keeps at most 20 open Postgres connections.",
	},
	{
		id: "rpc",
		term: "RPC",
		definition:
			"Remote procedure call lets one service call a named operation on another service over a network.",
		whyItMatters:
			"It gives services a direct request-response contract, but the call can fail or slow down like any network request.",
		example:
			"The checkout service calls inventory.Reserve before it confirms an order.",
	},
];

const architecturePatterns: readonly ArchitecturePatternCard[] = [
	{
		id: "client-server",
		title: "Client-server",
		category: "architecture-pattern",
		description:
			"Clients ask a central service for data or work. The service owns the rules and data access.",
		solves: "It gives many clients one shared place to reach an application.",
		useWhen: "Use it for most web and mobile products with a clear backend.",
		tradeoff: "The server tier must scale and stay available as demand grows.",
		example: "A mobile app calls an API that reads and writes account data.",
	},
	{
		id: "layered",
		title: "Layered architecture",
		category: "architecture-pattern",
		description:
			"The system separates responsibilities into layers, such as UI, application rules, and data access.",
		solves:
			"It makes each area easier to understand and test without knowing every other area.",
		useWhen:
			"Use it when one application has stable responsibilities and a team needs clear boundaries.",
		tradeoff:
			"A request can pass through extra layers, and strict boundaries can feel heavy for small features.",
		example:
			"A controller calls a service, which calls a repository that reads Postgres.",
	},
	{
		id: "microservices",
		title: "Microservices",
		category: "architecture-pattern",
		description:
			"The system splits business areas into small services that deploy and scale separately.",
		solves:
			"It lets teams change and scale a busy area without releasing one large application.",
		useWhen:
			"Use it when team and domain boundaries are clear and the cost of distributed systems is justified.",
		tradeoff:
			"Network calls, shared data, testing, and operations become harder.",
		example:
			"Catalog, checkout, and billing run as separate services with separate deploys.",
	},
	{
		id: "event-driven",
		title: "Event-driven architecture",
		category: "architecture-pattern",
		description:
			"Services publish facts about completed work, and other services react to those facts later.",
		solves:
			"It separates the producer from work that does not need to finish in the same request.",
		useWhen:
			"Use it when several parts of the product react to the same change or when work can run later.",
		tradeoff:
			"The system becomes harder to trace, and data may be temporarily out of date.",
		example: "Order placed triggers inventory, email, and analytics events.",
	},
	{
		id: "queue-based",
		title: "Queue-based load leveling",
		category: "architecture-pattern",
		description:
			"A queue holds incoming work while workers process it at a safe rate.",
		solves: "It absorbs bursts and protects a slow downstream system.",
		useWhen:
			"Use it for work that can finish after the user receives a response.",
		tradeoff:
			"Work may wait in the queue, so users do not get an immediate final result.",
		example: "A video upload creates a job that workers transcode later.",
	},
	{
		id: "api-gateway",
		title: "API gateway",
		category: "architecture-pattern",
		description:
			"One edge service receives client requests and routes them to internal services.",
		solves:
			"It gives clients one public entry point for auth, routing, and request shaping.",
		useWhen:
			"Use it when many backend services should not each expose a separate public API.",
		tradeoff:
			"The gateway can become a bottleneck or collect too much business logic.",
		example:
			"A gateway verifies a session, then calls profile and order services for one mobile screen.",
	},
	{
		id: "cqrs",
		title: "CQRS",
		category: "architecture-pattern",
		description:
			"Command-query responsibility separation uses different models for changing data and reading data.",
		solves:
			"It lets a complex write path protect business rules while a read path serves fast, simple views.",
		useWhen:
			"Use it when reads and writes have very different shapes or scaling needs.",
		tradeoff: "You must keep two models in sync and accept more moving parts.",
		example:
			"An order command writes normalized data, while a read model stores a ready-to-display order summary.",
	},
	{
		id: "event-sourcing",
		title: "Event sourcing",
		category: "architecture-pattern",
		description:
			"The system stores each business change as an ordered event instead of only storing the latest state.",
		solves:
			"It provides an audit trail and lets you rebuild a past state by replaying events.",
		useWhen:
			"Use it when the history of a change matters as much as the latest value.",
		tradeoff:
			"Event versions, replay speed, and correcting bad events need careful design.",
		example:
			"A bank account stores deposits and withdrawals, then calculates the current balance from them.",
	},
	{
		id: "pipeline",
		title: "Pipeline",
		category: "architecture-pattern",
		description:
			"A pipeline passes data through a fixed sequence of small processing steps.",
		solves:
			"It breaks a complex transformation into steps that teams can test and replace independently.",
		useWhen:
			"Use it for data processing, compilers, media work, or request processing with clear stages.",
		tradeoff:
			"A slow stage limits the whole flow, and passing large data between stages can cost time.",
		example:
			"An ingestion pipeline validates a log, scrubs secrets, enriches it, then stores it.",
	},
	{
		id: "sidecar",
		title: "Sidecar",
		category: "architecture-pattern",
		description:
			"A helper process runs beside an application process and handles a shared operational concern.",
		solves:
			"It keeps concerns such as logging, network policy, or certificate renewal out of application code.",
		useWhen: "Use it when many services need the same local helper behavior.",
		tradeoff:
			"Every application instance uses more resources and gains another thing to operate.",
		example: "A proxy sidecar handles mutual TLS for a service in Kubernetes.",
	},
	{
		id: "serverless",
		title: "Serverless functions",
		category: "architecture-pattern",
		description:
			"Small functions run on demand in a managed platform instead of on servers you operate.",
		solves:
			"It removes server management for event-driven or uneven workloads.",
		useWhen:
			"Use it for short tasks with variable traffic and simple deployment needs.",
		tradeoff:
			"Startup delay, execution limits, and platform-specific behavior can constrain the design.",
		example:
			"A function creates a thumbnail when an image arrives in object storage.",
	},
	{
		id: "peer-to-peer",
		title: "Peer-to-peer",
		category: "architecture-pattern",
		description:
			"Participants communicate directly and each can provide work or data to other participants.",
		solves:
			"It can spread bandwidth and work across many participants instead of one central server.",
		useWhen:
			"Use it when direct sharing helps and the system can handle unreliable peers.",
		tradeoff:
			"Discovery, trust, privacy, and inconsistent peer availability are difficult.",
		example:
			"A file-sharing network downloads different file pieces from several peers.",
	},
];

const algorithms: readonly AlgorithmDeck[] = [
	{
		id: "two-sum",
		title: "Two Sum",
		summary: "Find two indexes whose values add to a target.",
		cards: [
			{
				heading: "Pattern",
				body: "Use a hash map to remember values you have already passed. For each value, ask whether its partner has appeared before.",
			},
			{
				heading: "Steps",
				body: "Walk left to right. Compute target minus the current value. If that number is in the map, return its saved index and the current index. Otherwise save the current value and index.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function twoSum(nums: number[], target: number): [number, number] {
	const seen = new Map<number, number>();

	for (let index = 0; index < nums.length; index++) {
		const value = nums[index];
		const match = seen.get(target - value);
		if (match !== undefined) return [match, index];

		seen.set(value, index);
	}

	throw new Error("No matching pair");
}`,
				body: "Look before saving the current value. That prevents one array item from matching itself.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func TwoSum(nums []int, target int) []int {
	seen := make(map[int]int)

	for index, value := range nums {
		if match, ok := seen[target-value]; ok {
			return []int{match, index}
		}
		seen[value] = index
	}

	return nil
}`,
				body: "The boolean from a Go map lookup tells you whether the partner exists, even when its saved index is zero.",
			},
			{ heading: "Cost", body: "Time: O(n). Memory: O(n)." },
			{
				heading: "Common mistake",
				body: "Calling indexOf for each value turns the solution back into O(n²).",
			},
		],
	},
	{
		id: "valid-parentheses",
		title: "Valid Parentheses",
		summary: "Check whether brackets close in the right order.",
		cards: [
			{
				heading: "Pattern",
				body: "Use a stack. The last opening bracket must be the first one to close.",
			},
			{
				heading: "Steps",
				body: "Push open brackets. On a closing bracket, pop the stack and check that the pair matches. The stack must be empty at the end.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function isValid(text: string): boolean {
	const openFor = new Map([
		[")", "("],
		["]", "["],
		["}", "{"],
	]);
	const stack: string[] = [];

	for (const character of text) {
		const expectedOpen = openFor.get(character);
		if (expectedOpen) {
			if (stack.pop() !== expectedOpen) return false;
		} else {
			stack.push(character);
		}
	}

	return stack.length === 0;
}`,
				body: "A missing item from pop does not match any opening bracket, so an early closing bracket returns false.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func IsValid(text string) bool {
	openFor := map[rune]rune{')': '(', ']': '[', '}': '{'}
	stack := make([]rune, 0, len(text))

	for _, character := range text {
		if expectedOpen, closing := openFor[character]; closing {
			if len(stack) == 0 || stack[len(stack)-1] != expectedOpen {
				return false
			}
			stack = stack[:len(stack)-1]
		} else {
			stack = append(stack, character)
		}
	}

	return len(stack) == 0
}`,
				body: "A slice works as a stack when you append to push and shorten it to pop.",
			},
			{ heading: "Cost", body: "Time: O(n). Memory: O(n) in the worst case." },
			{
				heading: "Common mistake",
				body: "Returning true without checking whether opening brackets remain.",
			},
		],
	},
	{
		id: "longest-unique-substring",
		title: "Longest Substring Without Repeating Characters",
		summary: "Find the longest part of a string with no repeated character.",
		cards: [
			{
				heading: "Pattern",
				body: "Use a sliding window and remember the last index of each character.",
			},
			{
				heading: "Steps",
				body: "Move the right edge one character at a time. If the character appears inside the current window, move the left edge past its old index. Track the longest window.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function lengthOfLongestSubstring(text: string): number {
	const lastIndex = new Map<string, number>();
	let left = 0;
	let best = 0;

	for (let right = 0; right < text.length; right++) {
		const previous = lastIndex.get(text[right]);
		if (previous !== undefined) left = Math.max(left, previous + 1);
		lastIndex.set(text[right], right);
		best = Math.max(best, right - left + 1);
	}

	return best;
}`,
				body: "Math.max keeps the left edge from moving backward when the old repeat sits outside the window.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func LengthOfLongestSubstring(text string) int {
	lastIndex := make(map[rune]int)
	left, best := 0, 0

	for right, character := range []rune(text) {
		if previous, ok := lastIndex[character]; ok && previous >= left {
			left = previous + 1
		}
		lastIndex[character] = right
		if length := right - left + 1; length > best {
			best = length
		}
	}

	return best
}`,
				body: "Using runes makes the indexes refer to characters rather than UTF-8 bytes.",
			},
			{
				heading: "Cost",
				body: "Time: O(n). Memory: O(number of distinct characters).",
			},
			{
				heading: "Common mistake",
				body: "Moving the left edge backward after an old repeat.",
			},
		],
	},
	{
		id: "merge-intervals",
		title: "Merge Intervals",
		summary: "Combine overlapping time ranges.",
		cards: [
			{
				heading: "Pattern",
				body: "Sort intervals by start time, then merge each interval with the last result when they overlap.",
			},
			{
				heading: "Steps",
				body: "Sort. Start with the first interval. If the next interval starts before the current result ends, extend the end. Otherwise add a new result interval.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function merge(intervals: number[][]): number[][] {
	if (intervals.length === 0) return [];
	const sorted = intervals
		.map(([start, end]) => [start, end])
		.sort((a, b) => a[0] - b[0]);
	const merged = [sorted[0]];

	for (const interval of sorted.slice(1)) {
		const current = merged[merged.length - 1];
		if (interval[0] <= current[1]) {
			current[1] = Math.max(current[1], interval[1]);
		} else {
			merged.push(interval);
		}
	}

	return merged;
}`,
				body: "Copy each interval before sorting when the caller may expect the original input to remain unchanged.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `import "sort"

func Merge(intervals [][]int) [][]int {
	if len(intervals) == 0 {
		return nil
	}

	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][0] < intervals[j][0]
	})
	merged := [][]int{intervals[0]}

	for _, interval := range intervals[1:] {
		current := merged[len(merged)-1]
		if interval[0] <= current[1] {
			if interval[1] > current[1] {
				current[1] = interval[1]
			}
		} else {
			merged = append(merged, interval)
		}
	}

	return merged
}`,
				body: "Import sort. The final result reuses interval slices from the input.",
			},
			{
				heading: "Cost",
				body: "Time: O(n log n) from sorting. Memory: O(n) for the result.",
			},
			{
				heading: "Common mistake",
				body: "Replacing the end with the next end instead of keeping the larger end.",
			},
		],
	},
	{
		id: "rotated-binary-search",
		title: "Search in Rotated Sorted Array",
		summary: "Find a target in a rotated sorted array.",
		cards: [
			{
				heading: "Pattern",
				body: "Use binary search. At every step, at least one half of the range is still sorted.",
			},
			{
				heading: "Steps",
				body: "Find the middle. Decide which half is ordered. If the target lies inside that ordered half, keep it. Otherwise search the other half.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function search(nums: number[], target: number): number {
	let left = 0;
	let right = nums.length - 1;

	while (left <= right) {
		const middle = Math.floor((left + right) / 2);
		if (nums[middle] === target) return middle;

		if (nums[left] <= nums[middle]) {
			if (nums[left] <= target && target < nums[middle]) right = middle - 1;
			else left = middle + 1;
		} else {
			if (nums[middle] < target && target <= nums[right]) left = middle + 1;
			else right = middle - 1;
		}
	}

	return -1;
}`,
				body: "The comparisons decide whether the target belongs to the sorted half.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func Search(nums []int, target int) int {
	left, right := 0, len(nums)-1

	for left <= right {
		middle := left + (right-left)/2
		if nums[middle] == target { return middle }

		if nums[left] <= nums[middle] {
			if nums[left] <= target && target < nums[middle] { right = middle - 1 } else { left = middle + 1 }
		} else {
			if nums[middle] < target && target <= nums[right] { left = middle + 1 } else { right = middle - 1 }
		}
	}

	return -1
}`,
				body: "The midpoint form avoids overflow in languages with fixed-size integers.",
			},
			{ heading: "Cost", body: "Time: O(log n). Memory: O(1)." },
			{
				heading: "Common mistake",
				body: "Assuming the left half is always the sorted half.",
			},
		],
	},
	{
		id: "reverse-linked-list",
		title: "Reverse Linked List",
		summary: "Reverse a linked list in place.",
		cards: [
			{
				heading: "Pattern",
				body: "Keep the previous node and the current node. Save the next node before changing the current link.",
			},
			{
				heading: "Steps",
				body: "Save current.next. Point current.next at previous. Move previous to current and current to the saved next node. Return previous.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `type ListNode = { value: number; next: ListNode | null };

function reverseList(head: ListNode | null): ListNode | null {
	let previous: ListNode | null = null;
	let current = head;

	while (current) {
		const next = current.next;
		current.next = previous;
		previous = current;
		current = next;
	}

	return previous;
}`,
				body: "The saved next pointer is what keeps the rest of the list from being lost.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `type ListNode struct {
	Val  int
	Next *ListNode
}

func ReverseList(head *ListNode) *ListNode {
	var previous *ListNode
	current := head

	for current != nil {
		next := current.Next
		current.Next = previous
		previous = current
		current = next
	}

	return previous
}`,
				body: "A nil pointer naturally handles an empty list.",
			},
			{ heading: "Cost", body: "Time: O(n). Memory: O(1)." },
			{ heading: "Common mistake", body: "Changing next before saving it." },
		],
	},
	{
		id: "tree-level-order",
		title: "Binary Tree Level Order Traversal",
		summary: "Return tree values one level at a time.",
		cards: [
			{
				heading: "Pattern",
				body: "Use breadth-first search with a queue. The queue length at the start of a round is the size of one level.",
			},
			{
				heading: "Steps",
				body: "Put the root in the queue. For each level, remove exactly the current queue length, save values in one row, and add each node's children.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `type TreeNode = { value: number; left: TreeNode | null; right: TreeNode | null };

function levelOrder(root: TreeNode | null): number[][] {
	if (!root) return [];
	const queue = [root];
	const levels: number[][] = [];

	for (let head = 0; head < queue.length;) {
		const end = queue.length;
		const level: number[] = [];
		while (head < end) {
			const node = queue[head++];
			level.push(node.value);
			if (node.left) queue.push(node.left);
			if (node.right) queue.push(node.right);
		}
		levels.push(level);
	}

	return levels;
}`,
				body: "Move a head index instead of using shift, which would repeatedly move every remaining item.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}

func LevelOrder(root *TreeNode) [][]int {
	if root == nil {
		return nil
	}
	queue := []*TreeNode{root}
	levels := make([][]int, 0)

	for len(queue) > 0 {
		size := len(queue)
		level := make([]int, 0, size)
		for index := 0; index < size; index++ {
			node := queue[0]
			queue = queue[1:]
			level = append(level, node.Val)
			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
		levels = append(levels, level)
	}

	return levels
}`,
				body: "Each outer loop takes one snapshot of the queue size before it adds children.",
			},
			{
				heading: "Cost",
				body: "Time: O(n). Memory: O(n) in the widest level.",
			},
			{
				heading: "Common mistake",
				body: "Letting children added in this round leak into the current level.",
			},
		],
	},
	{
		id: "number-of-islands",
		title: "Number of Islands",
		summary: "Count connected groups in a grid.",
		cards: [
			{
				heading: "Pattern",
				body: "Treat each land cell as part of a graph. A graph walk marks one whole island at a time.",
			},
			{
				heading: "Steps",
				body: "Scan the grid. On unvisited land, add one to the count and visit every connected land neighbor. Mark visited cells so you do not count them twice.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function numIslands(grid: string[][]): number {
	let count = 0;

	function visit(row: number, column: number): void {
		if (row < 0 || column < 0 || row >= grid.length || column >= grid[0].length) return;
		if (grid[row][column] !== "1") return;
		grid[row][column] = "0";
		visit(row + 1, column); visit(row - 1, column);
		visit(row, column + 1); visit(row, column - 1);
	}

	for (let row = 0; row < grid.length; row++) {
		for (let column = 0; column < grid[row].length; column++) {
			if (grid[row][column] === "1") { count++; visit(row, column); }
		}
	}

	return count;
}`,
				body: "This version changes the grid. Use a separate visited set if the input must remain unchanged.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func NumIslands(grid [][]byte) int {
	var visit func(int, int)
	visit = func(row, column int) {
		if row < 0 || column < 0 || row >= len(grid) || column >= len(grid[0]) || grid[row][column] != '1' { return }
		grid[row][column] = '0'
		visit(row+1, column); visit(row-1, column)
		visit(row, column+1); visit(row, column-1)
	}

	count := 0
	for row := range grid {
		for column := range grid[row] {
			if grid[row][column] == '1' { count++; visit(row, column) }
		}
	}
	return count
}`,
				body: "The recursive function closes over grid and marks each land cell once.",
			},
			{
				heading: "Cost",
				body: "Time: O(rows × columns). Memory: O(rows × columns) in the worst recursive case.",
			},
			{
				heading: "Common mistake",
				body: "Counting every land cell instead of every connected group.",
			},
		],
	},
	{
		id: "course-schedule",
		title: "Course Schedule",
		summary: "Decide whether dependency rules contain a cycle.",
		cards: [
			{
				heading: "Pattern",
				body: "Use topological sorting. A cycle exists when you cannot remove every node with its prerequisites satisfied.",
			},
			{
				heading: "Steps",
				body: "Build outgoing edges and count incoming prerequisites. Start with courses that have none. Remove their edges. If you process every course, there is no cycle.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function canFinish(courseCount: number, prerequisites: number[][]): boolean {
	const next = Array.from({ length: courseCount }, () => [] as number[]);
	const incoming = Array(courseCount).fill(0);
	for (const [course, prerequisite] of prerequisites) {
		next[prerequisite].push(course);
		incoming[course]++;
	}

	const queue = incoming.flatMap((count, course) => (count === 0 ? [course] : []));
	for (let head = 0; head < queue.length; head++) {
		for (const course of next[queue[head]]) {
			if (--incoming[course] === 0) queue.push(course);
		}
	}

	return queue.length === courseCount;
}`,
				body: "The number of courses removed tells you whether a cycle blocked the rest.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func CanFinish(courseCount int, prerequisites [][]int) bool {
	next := make([][]int, courseCount)
	incoming := make([]int, courseCount)
	for _, pair := range prerequisites {
		course, prerequisite := pair[0], pair[1]
		next[prerequisite] = append(next[prerequisite], course)
		incoming[course]++
	}

	queue := make([]int, 0)
	for course, count := range incoming { if count == 0 { queue = append(queue, course) } }
	for head := 0; head < len(queue); head++ {
		for _, course := range next[queue[head]] {
			incoming[course]--
			if incoming[course] == 0 { queue = append(queue, course) }
		}
	}

	return len(queue) == courseCount
}`,
				body: "The edge points from prerequisite to dependent course because removing a prerequisite unlocks its dependents.",
			},
			{
				heading: "Cost",
				body: "Time: O(courses + prerequisites). Memory: O(courses + prerequisites).",
			},
			{
				heading: "Common mistake",
				body: "Building edges in one direction but updating counts for the other direction.",
			},
		],
	},
	{
		id: "coin-change",
		title: "Coin Change",
		summary: "Find the fewest coins needed to make an amount.",
		cards: [
			{
				heading: "Pattern",
				body: "Use dynamic programming. The best answer for one amount builds from the best answer for a smaller amount.",
			},
			{
				heading: "Steps",
				body: "Set amount zero to zero coins. For every later amount, try each coin and keep one plus the best result for amount minus that coin.",
			},
			{
				heading: "TypeScript solution",
				language: "TypeScript",
				code: `function coinChange(coins: number[], amount: number): number {
	const best = Array(amount + 1).fill(Infinity);
	best[0] = 0;

	for (let current = 1; current <= amount; current++) {
		for (const coin of coins) {
			if (coin <= current) best[current] = Math.min(best[current], best[current - coin] + 1);
		}
	}

	return best[amount] === Infinity ? -1 : best[amount];
}`,
				body: "Infinity marks amounts that no combination of the available coins can make.",
			},
			{
				heading: "Go solution",
				language: "Go",
				code: `func CoinChange(coins []int, amount int) int {
	best := make([]int, amount+1)
	for current := 1; current <= amount; current++ { best[current] = amount + 1 }

	for current := 1; current <= amount; current++ {
		for _, coin := range coins {
			if coin <= current && best[current-coin]+1 < best[current] {
				best[current] = best[current-coin] + 1
			}
		}
	}

	if best[amount] == amount+1 { return -1 }
	return best[amount]
}`,
				body: "Amount plus one is a safe stand-in for infinity because no valid answer needs more coins than the amount itself.",
			},
			{
				heading: "Cost",
				body: "Time: O(amount × number of coins). Memory: O(amount).",
			},
			{
				heading: "Common mistake",
				body: "Using a greedy choice, which fails for coin sets such as [1, 3, 4].",
			},
		],
	},
];

export function getFlashcardDecks(): Effect.Effect<FlashcardDecks, never> {
	return Effect.succeed({
		systemTerms: [...systemTerms, ...additionalSystemTerms].map((card) => ({
			...card,
			category: "concept" as const,
		})),
		architecturePatterns,
		algorithms,
	});
}
