export const lessonStages = [
	"spot",
	"state",
	"write",
	"trace",
	"choose",
	"use",
	"check",
] as const;

export type LessonStage = (typeof lessonStages)[number];

export type PracticeProblem = {
	title: string;
	slug: string;
	prompt: string;
};

export type AlgorithmPatternLesson = {
	id: string;
	title: string;
	summary: string;
	spot: string;
	state: string;
	recipe: string;
	trace: string;
	choose: string;
	problems: readonly PracticeProblem[];
	complexity: string;
	mistake: string;
};

export type AlgorithmPath = {
	id: string;
	title: string;
	summary: string;
	lessons: readonly AlgorithmPatternLesson[];
};

export const algorithmPaths: readonly AlgorithmPath[] = [
	{
		id: "arrays-and-strings",
		title: "Arrays and strings",
		summary:
			"Track values, move through ranges, and reuse work across an array.",
		lessons: [
			{
				id: "hash-map-lookup",
				title: "Hash map lookup",
				summary: "Trade memory for fast checks by saving what you have seen.",
				spot: "Look for a pair, match, duplicate, or complement. The answer depends on whether a value appeared before.",
				state:
					"Before each step, the map contains every earlier value you may need to find in constant time.",
				recipe: `const seen = new Map<number, number>();

for (let index = 0; index < nums.length; index++) {
	const needed = target - nums[index];
	if (seen.has(needed)) return [seen.get(needed)!, index];
	seen.set(nums[index], index);
}`,
				trace:
					"For [2, 7, 11] and target 9, save 2. At 7, ask for 2. The map has it, so the pair is complete.",
				choose:
					"Use a set when presence is enough. Use a map when you also need an index, count, or matching value.",
				problems: [
					{
						title: "Two Sum",
						slug: "two-sum",
						prompt: "Save each value after checking its complement.",
					},
					{
						title: "Contains Duplicate",
						slug: "contains-duplicate",
						prompt: "Reduce the map to a set.",
					},
					{
						title: "Longest Consecutive Sequence",
						slug: "longest-consecutive-sequence",
						prompt: "Use a set, then start only at sequence heads.",
					},
				],
				complexity: "A full scan is usually O(n) time and O(n) memory.",
				mistake:
					"Saving the current value before checking can let one item match itself.",
			},
			{
				id: "frequency-counting",
				title: "Frequency counting",
				summary: "Count what appears, then compare or group by those counts.",
				spot: "Look for anagrams, inventories, repeated characters, or a need to compare two collections without order.",
				state:
					"The count for each key equals how many matching items the scan has seen so far.",
				recipe: `const counts = new Map<string, number>();

for (const item of items) {
	counts.set(item, (counts.get(item) ?? 0) + 1);
}`,
				trace:
					"Scanning 'aab' changes a from 0 to 1 to 2, then b from 0 to 1. The map ends as {a: 2, b: 1}.",
				choose:
					"Sort when order will help later. Count when the key range is small or you only care how often each item appears.",
				problems: [
					{
						title: "Valid Anagram",
						slug: "valid-anagram",
						prompt: "Add counts from one word and remove them with the other.",
					},
					{
						title: "Ransom Note",
						slug: "ransom-note",
						prompt: "Treat the magazine as an inventory.",
					},
					{
						title: "Group Anagrams",
						slug: "group-anagrams",
						prompt: "Use each word's frequency shape as a group key.",
					},
				],
				complexity:
					"Counting n items takes O(n) time and O(k) memory for k distinct keys.",
				mistake:
					"Checking only which keys exist loses the number of times each key appears.",
			},
			{
				id: "two-pointers",
				title: "Two pointers",
				summary: "Move two positions through one ordered search space.",
				spot: "Look for a sorted array, a pair, a palindrome, or a range whose ends can rule out choices.",
				state:
					"Everything outside the pointers has been proved useless or already handled.",
				recipe: `let left = 0;
let right = nums.length - 1;

while (left < right) {
	if (shouldMoveLeft(nums[left], nums[right])) left++;
	else right--;
}`,
				trace:
					"For a sorted pair sum, a sum below the target proves the left value is too small. Move only left.",
				choose:
					"Use a sliding window when you keep every item inside one moving range. Use two pointers when each move rules out an end or pairs two positions.",
				problems: [
					{
						title: "Valid Palindrome",
						slug: "valid-palindrome",
						prompt: "Compare the next valid character from each end.",
					},
					{
						title: "Two Sum II",
						slug: "two-sum-ii-input-array-is-sorted",
						prompt: "Let the sum tell you which end to move.",
					},
					{
						title: "Container With Most Water",
						slug: "container-with-most-water",
						prompt: "Move the shorter wall; the taller wall cannot fix it.",
					},
				],
				complexity:
					"Each pointer usually moves at most n times: O(n) time and O(1) memory.",
				mistake: "Moving both pointers can skip the only valid answer.",
			},
			{
				id: "sliding-window",
				title: "Sliding window",
				summary:
					"Maintain one useful contiguous range as its right edge grows.",
				spot: "Look for a longest, shortest, or best contiguous substring or subarray under a rule.",
				state:
					"After the shrink loop, the current window satisfies the rule and its stored counts match its contents.",
				recipe: `let left = 0;

for (let right = 0; right < nums.length; right++) {
	add(nums[right]);

	while (!windowIsValid()) {
		remove(nums[left++]);
	}

	updateAnswer(left, right);
}`,
				trace:
					"For a window with no repeats, add the right character. While its count exceeds one, remove from the left.",
				choose:
					"Use prefix sums for many fixed range totals. Use a window when the range itself moves to meet a rule.",
				problems: [
					{
						title: "Maximum Average Subarray I",
						slug: "maximum-average-subarray-i",
						prompt: "Start with a fixed-size window.",
					},
					{
						title: "Longest Substring Without Repeating Characters",
						slug: "longest-substring-without-repeating-characters",
						prompt: "Shrink until each character appears once.",
					},
					{
						title: "Minimum Window Substring",
						slug: "minimum-window-substring",
						prompt: "Track how many required counts the window satisfies.",
					},
				],
				complexity:
					"Both edges move forward at most n times: O(n) time and O(k) memory for window state.",
				mistake:
					"Updating the answer before restoring the window rule records invalid ranges.",
			},
			{
				id: "prefix-sums",
				title: "Prefix sums",
				summary:
					"Store totals up to each position so a range becomes one subtraction.",
				spot: "Look for repeated range sums, counts before an index, or subarrays with an exact total.",
				state: "prefix[i] equals the total of all input values before index i.",
				recipe: `const prefix = Array(nums.length + 1).fill(0);

for (let index = 0; index < nums.length; index++) {
	prefix[index + 1] = prefix[index] + nums[index];
}

const rangeSum = prefix[right + 1] - prefix[left];`,
				trace:
					"For [3, 1, 4], prefix is [0, 3, 4, 8]. The sum from index 1 through 2 is 8 - 3 = 5.",
				choose:
					"Use a sliding window when moving an edge can restore a rule. Prefix sums also work with negative values, where that window logic often fails.",
				problems: [
					{
						title: "Running Sum of 1d Array",
						slug: "running-sum-of-1d-array",
						prompt: "Build the prefix array in place.",
					},
					{
						title: "Range Sum Query — Immutable",
						slug: "range-sum-query-immutable",
						prompt: "Add a leading zero to remove edge cases.",
					},
					{
						title: "Subarray Sum Equals K",
						slug: "subarray-sum-equals-k",
						prompt: "Count earlier prefixes equal to current minus k.",
					},
				],
				complexity:
					"Build in O(n) time and memory; answer each range in O(1) time.",
				mistake:
					"Mixing inclusive input indexes with the exclusive prefix boundary causes off-by-one errors.",
			},
			{
				id: "merged-intervals",
				title: "Merged intervals",
				summary: "Sort ranges, then combine overlaps in one scan.",
				spot: "Look for time ranges, meetings, coverage, or overlapping start and end pairs.",
				state:
					"The result is sorted and disjoint; its last interval is the only one the next interval can overlap.",
				recipe: `intervals.sort((a, b) => a[0] - b[0]);
const merged: number[][] = [];

for (const interval of intervals) {
	const last = merged.at(-1);
	if (!last || last[1] < interval[0]) merged.push([...interval]);
	else last[1] = Math.max(last[1], interval[1]);
}`,
				trace:
					"After sorting, [1, 3] meets [2, 6]. Since 2 is at most 3, replace the end with max(3, 6).",
				choose:
					"Use an event sweep when many starts and ends must affect a running count. Merge when you only need the covered ranges.",
				problems: [
					{
						title: "Merge Intervals",
						slug: "merge-intervals",
						prompt: "Compare each start with the last merged end.",
					},
					{
						title: "Insert Interval",
						slug: "insert-interval",
						prompt: "Keep the ordered parts before and after one merged block.",
					},
					{
						title: "Non-overlapping Intervals",
						slug: "non-overlapping-intervals",
						prompt: "Keep the interval that ends first.",
					},
				],
				complexity:
					"Sorting costs O(n log n); the scan costs O(n). The result uses O(n) memory.",
				mistake:
					"Replacing the merged end instead of taking the larger end can shrink covered space.",
			},
		],
	},
	{
		id: "search-and-order",
		title: "Search and order",
		summary: "Use order to discard work or keep only the best candidates.",
		lessons: [
			{
				id: "binary-search",
				title: "Binary search",
				summary: "Cut a sorted search range in half after each check.",
				spot: "Look for sorted data, a monotone rule, or a search range where one test rejects an entire half.",
				state:
					"If the target exists, it remains inside the closed range from left through right.",
				recipe: `let left = 0;
let right = nums.length - 1;

while (left <= right) {
	const middle = left + Math.floor((right - left) / 2);
	if (nums[middle] === target) return middle;
	if (nums[middle] < target) left = middle + 1;
	else right = middle - 1;
}

return -1;`,
				trace:
					"In [1, 4, 7, 9], middle 4 is too small for target 7. Reject it and everything left of it.",
				choose:
					"Use two pointers when both ends help form an answer. Use binary search when one middle test rejects half the remaining choices.",
				problems: [
					{
						title: "Binary Search",
						slug: "binary-search",
						prompt: "Keep a closed [left, right] range.",
					},
					{
						title: "Search a 2D Matrix",
						slug: "search-a-2d-matrix",
						prompt: "Treat the matrix as one sorted array.",
					},
					{
						title: "Search in Rotated Sorted Array",
						slug: "search-in-rotated-sorted-array",
						prompt: "Find the sorted half before choosing a side.",
					},
				],
				complexity:
					"Each test halves the range: O(log n) time and O(1) memory.",
				mistake:
					"Failing to remove the middle from the next range can cause an endless loop.",
			},
			{
				id: "binary-search-bounds",
				title: "Binary search bounds",
				summary: "Find the first position where a sorted rule becomes true.",
				spot: "Look for first, last, lower bound, upper bound, insertion point, or the edge of repeated values.",
				state:
					"Every index before left is known false; every index at or after right is still a possible first true position.",
				recipe: `let left = 0;
let right = nums.length;

while (left < right) {
	const middle = left + Math.floor((right - left) / 2);
	if (nums[middle] < target) left = middle + 1;
	else right = middle;
}

return left;`,
				trace:
					"For [1, 2, 2, 4] and target 2, values below 2 move left. A value at least 2 keeps the middle as a candidate.",
				choose:
					"Exact search may stop at any match. Bound search keeps going until it proves the first or last valid position.",
				problems: [
					{
						title: "Search Insert Position",
						slug: "search-insert-position",
						prompt: "Return the first value not less than the target.",
					},
					{
						title: "Find First and Last Position",
						slug: "find-first-and-last-position-of-element-in-sorted-array",
						prompt: "Run one bound search for each edge.",
					},
					{
						title: "Find K Closest Elements",
						slug: "find-k-closest-elements",
						prompt: "Search for the best left edge of a fixed window.",
					},
				],
				complexity: "A bound search takes O(log n) time and O(1) memory.",
				mistake:
					"Mixing a closed range with a half-open range breaks the exit condition.",
			},
			{
				id: "binary-search-answer",
				title: "Search on the answer",
				summary: "Binary-search a result when feasibility changes only once.",
				spot: "Look for the smallest allowed maximum, the largest allowed minimum, or a numeric answer with a yes-or-no check.",
				state:
					"The search range contains the best answer, and feasible answers lie on one side of one boundary.",
				recipe: `let left = minimumPossible;
let right = maximumPossible;

while (left < right) {
	const middle = left + Math.floor((right - left) / 2);
	if (canFinish(middle)) right = middle;
	else left = middle + 1;
}

return left;`,
				trace:
					"If Koko can finish at speed 8, every faster speed also works. Keep 8 and search the slower half.",
				choose:
					"Use ordinary binary search when the input is sorted. Search the answer when only the pass-or-fail result is ordered.",
				problems: [
					{
						title: "Koko Eating Bananas",
						slug: "koko-eating-bananas",
						prompt: "Check whether one speed finishes in time.",
					},
					{
						title: "Capacity To Ship Packages Within D Days",
						slug: "capacity-to-ship-packages-within-d-days",
						prompt: "Search the smallest capacity that fits the day limit.",
					},
					{
						title: "Split Array Largest Sum",
						slug: "split-array-largest-sum",
						prompt: "Count parts needed under one maximum sum.",
					},
				],
				complexity:
					"O(check cost × log answer range), with memory set by the check.",
				mistake:
					"Binary search fails when the feasibility check does not change in one direction.",
			},
			{
				id: "heap-top-k",
				title: "Heap and top K",
				summary: "Keep quick access to the smallest or largest live candidate.",
				spot: "Look for top K, next best, repeated minimum or maximum, or a stream whose best items change.",
				state:
					"The heap contains only the candidates that can still belong to the answer; its root is the next one to remove.",
				recipe: `const heap = new MinPriorityQueue<number>();

for (const value of nums) {
	heap.enqueue(value);
	if (heap.size() > k) heap.dequeue();
}

return heap.front()!;`,
				trace:
					"For the three largest values, keep a min-heap of size three. Any new value larger than the root replaces it.",
				choose:
					"Sort when you need the full order once. Use a heap when you need only K items or must keep choosing the next best item.",
				problems: [
					{
						title: "Kth Largest Element in an Array",
						slug: "kth-largest-element-in-an-array",
						prompt: "Keep a min-heap of the k largest values.",
					},
					{
						title: "Top K Frequent Elements",
						slug: "top-k-frequent-elements",
						prompt: "Heap the frequency entries, not the raw input.",
					},
					{
						title: "Find Median from Data Stream",
						slug: "find-median-from-data-stream",
						prompt: "Balance one max-heap and one min-heap.",
					},
				],
				complexity:
					"Keeping K candidates takes O(n log k) time and O(k) memory.",
				mistake:
					"Using the wrong heap direction removes the values you meant to keep.",
			},
			{
				id: "monotonic-stack",
				title: "Monotonic stack",
				summary:
					"Keep unresolved items in sorted stack order until a new item settles them.",
				spot: "Look for the next greater or smaller value, spans, temperatures, or the first boundary that breaks an order.",
				state:
					"Indexes in the stack remain unresolved and their values stay monotone from bottom to top.",
				recipe: `const stack: number[] = [];

for (let index = 0; index < nums.length; index++) {
	while (stack.length && nums[stack.at(-1)!] < nums[index]) {
		const previous = stack.pop()!;
		answer[previous] = index - previous;
	}
	stack.push(index);
}`,
				trace:
					"When 75 follows 73, it resolves 73 as the next warmer value. Older, larger values stay on the stack.",
				choose:
					"Use a heap for the global next best item. Use a monotonic stack when order and nearest position both matter.",
				problems: [
					{
						title: "Daily Temperatures",
						slug: "daily-temperatures",
						prompt: "Store unresolved indexes in decreasing temperature order.",
					},
					{
						title: "Next Greater Element I",
						slug: "next-greater-element-i",
						prompt: "Resolve smaller values when a larger one arrives.",
					},
					{
						title: "Largest Rectangle in Histogram",
						slug: "largest-rectangle-in-histogram",
						prompt: "Use each lower bar to close taller rectangles.",
					},
				],
				complexity:
					"Each item enters and leaves once: O(n) time and O(n) memory.",
				mistake:
					"Storing values instead of indexes loses distance and duplicate position data.",
			},
			{
				id: "greedy-choice",
				title: "Greedy choice",
				summary: "Make one safe local choice that never needs to be undone.",
				spot: "Look for a best count, farthest reach, earliest finish, or proof that one local choice leaves the most room.",
				state:
					"The current choice is at least as good as any alternative for all future steps.",
				recipe: `items.sort(compareByUsefulOrder);
let answer = initialAnswer;

for (const item of items) {
	if (!canUse(item, answer)) continue;
	answer = take(item, answer);
}

return answer;`,
				trace:
					"For interval scheduling, choosing the meeting that ends first leaves at least as much room as any later ending choice.",
				choose:
					"Use dynamic programming when an early choice can block a better later plan. Use greedy only when you can prove the local choice is safe.",
				problems: [
					{
						title: "Best Time to Buy and Sell Stock",
						slug: "best-time-to-buy-and-sell-stock",
						prompt: "Keep the cheapest earlier buy.",
					},
					{
						title: "Jump Game",
						slug: "jump-game",
						prompt: "Keep the farthest reachable index.",
					},
					{
						title: "Gas Station",
						slug: "gas-station",
						prompt: "A failed segment rules out every start inside it.",
					},
				],
				complexity:
					"The scan is often O(n); sorting first makes it O(n log n). Memory is usually O(1) beyond sorting.",
				mistake:
					"Calling a rule greedy does not prove it. State why replacing any other choice cannot improve the result.",
			},
		],
	},
	{
		id: "linked-structures-and-trees",
		title: "Linked structures and trees",
		summary: "Follow pointers and use structure to choose the next move.",
		lessons: [
			{
				id: "linked-list-reversal",
				title: "Linked-list reversal",
				summary: "Turn links around without losing the unvisited list.",
				spot: "Look for reverse, reorder, swap, or an in-place change to the direction of linked nodes.",
				state:
					"Previous is the fully reversed prefix. Current is the first node not yet reversed.",
				recipe: `let previous: ListNode | null = null;
let current = head;

while (current) {
	const next = current.next;
	current.next = previous;
	previous = current;
	current = next;
}

return previous;`,
				trace:
					"At 1 → 2 → 3, save 2 before pointing 1 to null. Then 2 can point to 1 without losing 3.",
				choose:
					"Use ordinary pointer walking when links stay unchanged. Use reversal when later work needs the list in the other direction.",
				problems: [
					{
						title: "Reverse Linked List",
						slug: "reverse-linked-list",
						prompt: "Name previous, current, and next before writing code.",
					},
					{
						title: "Reverse Linked List II",
						slug: "reverse-linked-list-ii",
						prompt: "Protect the nodes just outside the reversed range.",
					},
					{
						title: "Reorder List",
						slug: "reorder-list",
						prompt:
							"Find the middle, reverse the back, then weave both halves.",
					},
				],
				complexity: "One pass takes O(n) time and O(1) memory.",
				mistake:
					"Changing current.next before saving it loses the rest of the list.",
			},
			{
				id: "fast-slow-pointers",
				title: "Fast and slow pointers",
				summary:
					"Move pointers at different speeds to expose a cycle or midpoint.",
				spot: "Look for a linked-list cycle, middle node, repeated state, or sequence where values act as next pointers.",
				state:
					"Fast advances twice for each slow step, so their distance changes in a predictable way.",
				recipe: `let slow = head;
let fast = head;

while (fast && fast.next) {
	slow = slow!.next;
	fast = fast.next.next;
	if (slow === fast) return true;
}

return false;`,
				trace:
					"On an acyclic list, fast reaches the end first. In a cycle, fast gains one node per round and must meet slow.",
				choose:
					"Use two pointers at opposite ends for ordered arrays. Use fast and slow when both pointers follow the same chain at different speeds.",
				problems: [
					{
						title: "Linked List Cycle",
						slug: "linked-list-cycle",
						prompt: "Let fast gain one step per round.",
					},
					{
						title: "Middle of the Linked List",
						slug: "middle-of-the-linked-list",
						prompt: "When fast ends, slow is halfway.",
					},
					{
						title: "Find the Duplicate Number",
						slug: "find-the-duplicate-number",
						prompt: "Treat each value as the next pointer in a cycle.",
					},
				],
				complexity: "The walk takes O(n) time and O(1) memory.",
				mistake:
					"Reading fast.next.next before proving both fast and fast.next exist causes a crash.",
			},
			{
				id: "tree-dfs",
				title: "Tree depth-first search",
				summary: "Solve a tree by combining answers from its children.",
				spot: "Look for root-to-leaf paths, subtree facts, depth, diameter, or a result built from left and right children.",
				state:
					"Each call returns a complete answer for the subtree rooted at its node.",
				recipe: `function dfs(node: TreeNode | null): number {
	if (!node) return baseValue;

	const left = dfs(node.left);
	const right = dfs(node.right);

	return combine(node, left, right);
}`,
				trace:
					"To find depth, each null child returns 0. A node returns one plus the larger depth from its children.",
				choose:
					"Use breadth-first search for levels or the nearest answer. Use depth-first search when a node's answer comes from its subtrees.",
				problems: [
					{
						title: "Maximum Depth of Binary Tree",
						slug: "maximum-depth-of-binary-tree",
						prompt: "Return one plus the deeper child.",
					},
					{
						title: "Path Sum",
						slug: "path-sum",
						prompt: "Pass the remaining sum down the path.",
					},
					{
						title: "Diameter of Binary Tree",
						slug: "diameter-of-binary-tree",
						prompt:
							"Return height while recording left height plus right height.",
					},
				],
				complexity:
					"Visit each node once: O(n) time and O(h) call-stack memory for height h.",
				mistake:
					"Returning the global answer instead of the subtree value confuses what each call promises.",
			},
			{
				id: "tree-bfs",
				title: "Tree breadth-first search",
				summary: "Use a queue to process a tree one level at a time.",
				spot: "Look for level order, nearest depth, right-side view, or work that groups nodes by distance from the root.",
				state:
					"At the start of a round, the queue segment from head to end contains exactly one tree level.",
				recipe: `const queue = [root];

for (let head = 0; head < queue.length;) {
	const end = queue.length;
	while (head < end) {
		const node = queue[head++];
		if (node.left) queue.push(node.left);
		if (node.right) queue.push(node.right);
	}
}`,
				trace:
					"Take the queue length before adding children. Those children belong to the next level, not the current one.",
				choose:
					"Use depth-first search for subtree results. Use breadth-first search when distance or level order decides the answer.",
				problems: [
					{
						title: "Binary Tree Level Order Traversal",
						slug: "binary-tree-level-order-traversal",
						prompt: "Take one queue-length snapshot per level.",
					},
					{
						title: "Binary Tree Right Side View",
						slug: "binary-tree-right-side-view",
						prompt: "Record the last node in each level.",
					},
					{
						title: "Binary Tree Zigzag Level Order Traversal",
						slug: "binary-tree-zigzag-level-order-traversal",
						prompt:
							"Keep traversal steady; change only how each row is written.",
					},
				],
				complexity:
					"Visit each node once: O(n) time and O(w) memory for the widest level.",
				mistake:
					"Using shift() on a large TypeScript array can add repeated O(n) moves. Keep a head index.",
			},
			{
				id: "binary-search-trees",
				title: "Binary search trees",
				summary:
					"Use the left-smaller, right-larger rule to search or validate.",
				spot: "Look for a binary search tree, ordered tree search, kth smallest value, or a need to check global ordering.",
				state:
					"Every node must fall inside the value bounds passed down from all its ancestors.",
				recipe: `function isValid(
	node: TreeNode | null,
	lower = -Infinity,
	upper = Infinity,
): boolean {
	if (!node) return true;
	if (node.val <= lower || node.val >= upper) return false;

	return isValid(node.left, lower, node.val)
		&& isValid(node.right, node.val, upper);
}`,
				trace:
					"A node in the right subtree of 10 must stay above 10 even if its direct parent is smaller than it.",
				choose:
					"Use ordinary tree DFS when child position has no ordering meaning. Use the BST rule to reject a whole branch or carry bounds.",
				problems: [
					{
						title: "Search in a Binary Search Tree",
						slug: "search-in-a-binary-search-tree",
						prompt: "Choose one child from the target comparison.",
					},
					{
						title: "Validate Binary Search Tree",
						slug: "validate-binary-search-tree",
						prompt: "Carry ancestor bounds, not just parent values.",
					},
					{
						title: "Kth Smallest Element in a BST",
						slug: "kth-smallest-element-in-a-bst",
						prompt: "In-order traversal visits values in sorted order.",
					},
				],
				complexity:
					"Search takes O(h) time. Full validation takes O(n). Recursion uses O(h) memory.",
				mistake:
					"Comparing a node only with its parent misses violations against older ancestors.",
			},
			{
				id: "tries",
				title: "Tries",
				summary:
					"Share prefixes so word lookup follows one character at a time.",
				spot: "Look for prefix search, a word dictionary, autocomplete, or many strings checked character by character.",
				state: "The current trie node represents the exact prefix read so far.",
				recipe: `type TrieNode = {
	children: Map<string, TrieNode>;
	isWord: boolean;
};

const root: TrieNode = { children: new Map(), isWord: false };
let node = root;

for (const char of word) {
	if (!node.children.has(char)) {
		node.children.set(char, { children: new Map(), isWord: false });
	}
	node = node.children.get(char)!;
}

node.isWord = true;`,
				trace:
					"Adding 'car' and 'cat' shares c → a. The last edge splits into r and t, and both ends mark a word.",
				choose:
					"Use a hash set for exact whole-word checks. Use a trie when shared prefixes or prefix walks do useful work.",
				problems: [
					{
						title: "Implement Trie",
						slug: "implement-trie-prefix-tree",
						prompt: "Separate prefix existence from complete-word status.",
					},
					{
						title: "Design Add and Search Words",
						slug: "design-add-and-search-words-data-structure",
						prompt: "Let a wildcard branch into every child.",
					},
					{
						title: "Word Search II",
						slug: "word-search-ii",
						prompt: "Walk the board and trie at the same time.",
					},
				],
				complexity:
					"Insert and lookup take O(L) time for word length L. Memory is O(total stored characters).",
				mistake:
					"A path in the trie proves a prefix exists, not that the prefix is a stored word.",
			},
		],
	},
	{
		id: "graphs",
		title: "Graphs",
		summary:
			"Walk connections, respect dependencies, and keep components apart.",
		lessons: [
			{
				id: "graph-traversal",
				title: "Graph traversal",
				summary: "Visit every reachable node once with DFS or BFS.",
				spot: "Look for nodes and edges, reachability, connected groups, copying a network, or an object that links to peers.",
				state:
					"Every marked node has been discovered, and no marked node will enter the work list twice.",
				recipe: `const seen = new Set<number>([start]);
const queue = [start];

for (let head = 0; head < queue.length; head++) {
	const node = queue[head];
	for (const neighbor of graph[node]) {
		if (seen.has(neighbor)) continue;
		seen.add(neighbor);
		queue.push(neighbor);
	}
}`,
				trace:
					"Mark a neighbor when you add it, not when you remove it. Two parents can then never add the same node twice.",
				choose:
					"DFS is often shorter for full exploration. BFS is better when unweighted distance or the nearest answer matters.",
				problems: [
					{
						title: "Find if Path Exists in Graph",
						slug: "find-if-path-exists-in-graph",
						prompt: "Build neighbors, then walk from the source.",
					},
					{
						title: "Clone Graph",
						slug: "clone-graph",
						prompt:
							"Map each old node to its new copy before following cycles.",
					},
					{
						title: "Number of Connected Components",
						slug: "number-of-connected-components-in-an-undirected-graph",
						prompt: "Start one traversal from each unseen node.",
					},
				],
				complexity:
					"Traversal takes O(vertices + edges) time and O(vertices) memory.",
				mistake:
					"Without a seen set, a cycle causes repeated work or endless recursion.",
			},
			{
				id: "grid-traversal",
				title: "Grid traversal",
				summary:
					"Treat each cell as a graph node with a small fixed set of neighbors.",
				spot: "Look for islands, regions, flood fill, shortest moves, or adjacent cells in a matrix.",
				state:
					"Each marked cell belongs to a region already being handled and will not be counted again.",
				recipe: `const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function visit(row: number, column: number): void {
	if (!isValid(row, column) || seen[row][column]) return;
	seen[row][column] = true;

	for (const [rowStep, columnStep] of directions) {
		visit(row + rowStep, column + columnStep);
	}
}`,
				trace:
					"Starting on one land cell reaches every touching land cell. The next unseen land cell must start another island.",
				choose:
					"Use DFS to mark a whole region. Use BFS when the first time you reach a cell must be its shortest distance.",
				problems: [
					{
						title: "Flood Fill",
						slug: "flood-fill",
						prompt: "Stop at bounds and cells with the wrong starting color.",
					},
					{
						title: "Number of Islands",
						slug: "number-of-islands",
						prompt: "Count each traversal start, not each land cell.",
					},
					{
						title: "Rotting Oranges",
						slug: "rotting-oranges",
						prompt: "Run BFS from every rotten orange at once.",
					},
				],
				complexity:
					"A full grid walk takes O(rows × columns) time and memory in the worst case.",
				mistake:
					"Checking grid values before checking bounds can read outside the matrix.",
			},
			{
				id: "topological-sort",
				title: "Topological sort",
				summary: "Order directed work so every prerequisite comes first.",
				spot: "Look for courses, builds, dependencies, alien order, or a need to detect a cycle in a directed graph.",
				state:
					"The queue contains exactly the unfinished nodes with no remaining prerequisites.",
				recipe: `const queue = incoming.flatMap((count, node) => count === 0 ? [node] : []);

for (let head = 0; head < queue.length; head++) {
	for (const next of graph[queue[head]]) {
		incoming[next]--;
		if (incoming[next] === 0) queue.push(next);
	}
}

return queue.length === nodeCount;`,
				trace:
					"Removing a zero-prerequisite course deletes its outgoing rules. A neighbor enters the queue only when its last rule is gone.",
				choose:
					"Use ordinary traversal for reachability. Use topological sort when edge direction means one node must come before another.",
				problems: [
					{
						title: "Course Schedule",
						slug: "course-schedule",
						prompt: "A short result means a cycle blocked the rest.",
					},
					{
						title: "Course Schedule II",
						slug: "course-schedule-ii",
						prompt: "The removal order is the answer.",
					},
					{
						title: "Alien Dictionary",
						slug: "alien-dictionary",
						prompt:
							"Build one edge from the first different character in each word pair.",
					},
				],
				complexity: "O(vertices + edges) time and memory.",
				mistake:
					"Building edges in one direction but counting prerequisites in the other breaks the queue.",
			},
			{
				id: "union-find",
				title: "Union-find",
				summary:
					"Merge groups and ask whether two items share a representative.",
				spot: "Look for dynamic connections, redundant edges, merged accounts, or repeated component checks as edges arrive.",
				state:
					"Every item points toward one root that names its connected component.",
				recipe: `function find(node: number): number {
	if (parent[node] !== node) parent[node] = find(parent[node]);
	return parent[node];
}

function union(a: number, b: number): boolean {
	const rootA = find(a);
	const rootB = find(b);
	if (rootA === rootB) return false;
	parent[rootB] = rootA;
	return true;
}`,
				trace:
					"After union(1, 2) and union(2, 3), find(3) reaches the same root as find(1). Path compression shortens that route.",
				choose:
					"Use graph traversal when you need paths or neighbors. Use union-find when you only need to merge groups and compare membership.",
				problems: [
					{
						title: "Redundant Connection",
						slug: "redundant-connection",
						prompt: "The first edge whose ends share a root closes a cycle.",
					},
					{
						title: "Accounts Merge",
						slug: "accounts-merge",
						prompt: "Union accounts that share an email.",
					},
					{
						title: "Number of Provinces",
						slug: "number-of-provinces",
						prompt: "Count distinct roots after all unions.",
					},
				],
				complexity:
					"With path compression and rank, m operations take almost O(m) time. Memory is O(n).",
				mistake:
					"Joining raw nodes instead of their roots can split or deepen a component incorrectly.",
			},
			{
				id: "shortest-path",
				title: "Shortest path",
				summary:
					"Expand the cheapest known route before any more costly route.",
				spot: "Look for the least cost, delay, effort, or distance in a graph with nonnegative edge weights.",
				state:
					"When a node leaves the min-heap with its best saved cost, no later route can improve that cost.",
				recipe: `const distance = Array(nodeCount).fill(Infinity);
distance[start] = 0;
const heap = new MinPriorityQueue<[number, number]>({
	compare: (a, b) => a[0] - b[0],
});
heap.enqueue([0, start]);

while (!heap.isEmpty()) {
	const [cost, node] = heap.dequeue()!;
	if (cost !== distance[node]) continue;
	for (const [next, weight] of graph[node]) {
		const nextCost = cost + weight;
		if (nextCost >= distance[next]) continue;
		distance[next] = nextCost;
		heap.enqueue([nextCost, next]);
	}
}`,
				trace:
					"A route costing 4 leaves the heap before one costing 7. With nonnegative edges, extending 7 can never beat the settled 4.",
				choose:
					"Use BFS when every edge has the same cost. Use Dijkstra's pattern when costs differ but never go below zero.",
				problems: [
					{
						title: "Network Delay Time",
						slug: "network-delay-time",
						prompt: "The answer is the largest settled distance.",
					},
					{
						title: "Cheapest Flights Within K Stops",
						slug: "cheapest-flights-within-k-stops",
						prompt: "Add stop count to the search state.",
					},
					{
						title: "Path With Minimum Effort",
						slug: "path-with-minimum-effort",
						prompt: "A path's cost is its largest edge, not their sum.",
					},
				],
				complexity:
					"With an adjacency list and heap: O((vertices + edges) log vertices) time and O(vertices + edges) memory.",
				mistake:
					"Marking a node final when it enters the heap can reject a cheaper route found before it leaves.",
			},
		],
	},
	{
		id: "choices-and-optimization",
		title: "Choices and optimization",
		summary:
			"Explore choices, reuse solved states, and build larger answers from smaller ones.",
		lessons: [
			{
				id: "recursion",
				title: "Recursion",
				summary:
					"Solve a smaller version of the same problem, then combine the result.",
				spot: "Look for nested structure, divide and conquer, repeated self-similar work, or a natural base case.",
				state:
					"Each call owns one smaller input and returns exactly the value its caller needs.",
				recipe: `function solve(input: Input): Result {
	if (isBaseCase(input)) return baseResult;

	const smaller = makeSmaller(input);
	const result = solve(smaller);

	return combine(input, result);
}`,
				trace:
					"To compute 2⁵, solve 2⁴, then multiply by 2. The chain stops at exponent 0 and returns 1.",
				choose:
					"Use a loop when the state moves in one straight line. Use recursion when the data or choices branch or nest.",
				problems: [
					{
						title: "Fibonacci Number",
						slug: "fibonacci-number",
						prompt:
							"Write the base cases first, then notice the repeated work.",
					},
					{
						title: "Pow(x, n)",
						slug: "powx-n",
						prompt: "Halve the exponent instead of subtracting one.",
					},
					{
						title: "Decode String",
						slug: "decode-string",
						prompt: "Let each call decode one bracketed level.",
					},
				],
				complexity:
					"Time depends on the number of calls. Stack memory equals the deepest call chain.",
				mistake:
					"A base case that does not cover every stopping state causes endless calls or bad values.",
			},
			{
				id: "backtracking",
				title: "Backtracking",
				summary:
					"Choose, explore, and undo to search every valid construction.",
				spot: "Look for all combinations, permutations, subsets, placements, or paths that must obey constraints.",
				state:
					"The current path holds one valid partial answer, and every choice before start has already been handled.",
				recipe: `function search(start: number): void {
	if (isComplete(path)) {
		answers.push([...path]);
		return;
	}

	for (let choice = start; choice < choices.length; choice++) {
		if (!isValid(choice, path)) continue;
		path.push(choices[choice]);
		search(nextStart(choice));
		path.pop();
	}
}`,
				trace:
					"For subsets, add 2, explore every subset that starts with 2, then remove 2 before trying the next first choice.",
				choose:
					"Use backtracking to list valid choices. Use dynamic programming to count or optimize when many branches reach the same state.",
				problems: [
					{
						title: "Subsets",
						slug: "subsets",
						prompt: "Save every partial path.",
					},
					{
						title: "Combination Sum",
						slug: "combination-sum",
						prompt: "Reuse a choice by recursing from the same index.",
					},
					{
						title: "N-Queens",
						slug: "n-queens",
						prompt:
							"Track blocked columns and diagonals before placing a queen.",
					},
				],
				complexity:
					"Time is proportional to the search tree, often exponential. Memory follows path depth plus saved answers.",
				mistake:
					"Saving path itself instead of a copy lets later undo steps change every saved answer.",
			},
			{
				id: "one-dimensional-dp",
				title: "One-dimensional dynamic programming",
				summary: "Save the answer for each earlier position or amount.",
				spot: "Look for a best count, score, or yes-or-no answer built from earlier indexes or smaller amounts.",
				state:
					"Before computing state i, every smaller state it depends on already holds its final answer.",
				recipe: `const best = Array(size + 1).fill(initialValue);
best[0] = baseValue;

for (let state = 1; state <= size; state++) {
	for (const choice of choices) {
		if (!canUse(choice, state)) continue;
		best[state] = combine(best[state], best[state - choice]);
	}
}

return best[size];`,
				trace:
					"For climbing stairs, ways[4] equals ways[3] plus ways[2] because the last move was one or two steps.",
				choose:
					"Use greedy only when one local choice is always safe. Use DP when different early choices can lead to the same later state.",
				problems: [
					{
						title: "Climbing Stairs",
						slug: "climbing-stairs",
						prompt: "Define ways to reach step i.",
					},
					{
						title: "House Robber",
						slug: "house-robber",
						prompt:
							"At each house, compare skipping it with taking it after i - 2.",
					},
					{
						title: "Word Break",
						slug: "word-break",
						prompt: "Let dp[i] mean the prefix ending before i can be built.",
					},
				],
				complexity:
					"Usually O(number of states × choices per state) time and O(number of states) memory.",
				mistake:
					"Writing a recurrence before naming what dp[i] means leads to wrong indexes and base cases.",
			},
			{
				id: "grid-dp",
				title: "Grid dynamic programming",
				summary:
					"Build each cell's answer from the cells that can lead into it.",
				spot: "Look for path counts or best path costs in a grid where moves follow fixed directions.",
				state:
					"When a cell is computed, every predecessor allowed by the movement rules already has its final value.",
				recipe: `const dp = Array.from(
	{ length: rows },
	() => Array(columns).fill(initialValue),
);
dp[0][0] = baseValue;

for (let row = 0; row < rows; row++) {
	for (let column = 0; column < columns; column++) {
		dp[row][column] = combineFromTopAndLeft(row, column, dp);
	}
}`,
				trace:
					"For unique paths, each cell receives every path from above plus every path from the left.",
				choose:
					"Use graph search when movement can cycle or you need reachability. Use grid DP when a fixed direction gives an acyclic state order.",
				problems: [
					{
						title: "Unique Paths",
						slug: "unique-paths",
						prompt: "Add the count from above and left.",
					},
					{
						title: "Minimum Path Sum",
						slug: "minimum-path-sum",
						prompt: "Add the cell cost to the cheaper predecessor.",
					},
					{
						title: "Longest Increasing Path in a Matrix",
						slug: "longest-increasing-path-in-a-matrix",
						prompt:
							"Memoize each cell because increasing moves form a directed acyclic graph.",
					},
				],
				complexity:
					"Most grid DP visits each cell once: O(rows × columns) time and memory.",
				mistake:
					"Filling cells before their dependencies are ready turns correct formulas into wrong results.",
			},
			{
				id: "knapsack-dp",
				title: "Knapsack dynamic programming",
				summary:
					"Track what totals or values are possible as each choice arrives.",
				spot: "Look for a target sum, limited capacity, partition, coin total, or choose-or-skip decision.",
				state:
					"After one item, dp[total] describes the best or possible result using only items handled so far.",
				recipe: `const possible = Array(target + 1).fill(false);
possible[0] = true;

for (const value of values) {
	for (let total = target; total >= value; total--) {
		possible[total] ||= possible[total - value];
	}
}

return possible[target];`,
				trace:
					"With value 3, update totals from high to low. That prevents the same 3 from being used again in the same round.",
				choose:
					"Loop totals backward when each item may be used once. Loop forward when a choice may be reused without limit.",
				problems: [
					{
						title: "Partition Equal Subset Sum",
						slug: "partition-equal-subset-sum",
						prompt: "Ask whether half the full sum is possible.",
					},
					{
						title: "Target Sum",
						slug: "target-sum",
						prompt: "Turn plus and minus choices into a subset count.",
					},
					{
						title: "Coin Change",
						slug: "coin-change",
						prompt: "Let each amount keep the fewest coins found so far.",
					},
				],
				complexity:
					"O(items × target) time and O(target) memory in the one-row form.",
				mistake:
					"The total-loop direction changes whether one item can be reused. Choose it on purpose.",
			},
			{
				id: "bit-manipulation",
				title: "Bit manipulation",
				summary: "Use binary flags and XOR laws to store or cancel state.",
				spot: "Look for odd and even counts, powers of two, subsets as masks, or a request to avoid arithmetic operators.",
				state:
					"Each bit position represents one independent yes-or-no fact about the values processed so far.",
				recipe: `let bits = 0;

for (const value of nums) {
	bits ^= value;
}

return bits;`,
				trace:
					"Because x XOR x is 0 and 0 XOR y is y, paired values cancel in any order and leave the lone value.",
				choose:
					"Use a set when you need the actual members. Use a bit mask when the state is small, binary, and mapped to fixed positions.",
				problems: [
					{
						title: "Single Number",
						slug: "single-number",
						prompt: "Cancel every pair with XOR.",
					},
					{
						title: "Counting Bits",
						slug: "counting-bits",
						prompt:
							"Reuse the count for the number with its lowest set bit removed.",
					},
					{
						title: "Sum of Two Integers",
						slug: "sum-of-two-integers",
						prompt:
							"Use XOR for the sum without carries and AND for the carries.",
					},
				],
				complexity:
					"A scan is O(n). Fixed-width bit work is O(1) per value and uses O(1) memory.",
				mistake:
					"JavaScript bit operators convert numbers to signed 32-bit integers.",
			},
		],
	},
];
