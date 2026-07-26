# Algorithm Pattern Paths Design

## Goal

Replace the ten-problem algorithm answer deck with five self-paced paths. The
paths will teach the core patterns behind most coding-interview problems. They
will train the user to spot, recall, trace, and use each pattern in TypeScript.

The page will not use dates, streaks, deadlines, or a daily queue.

## Paths

The course will cover 29 patterns:

1. Arrays and strings: hash map lookup, frequency counting, two pointers,
   sliding window, prefix sums, and merged intervals.
2. Search and order: binary search, lower and upper bounds, search on the
   answer, heaps and top K, monotonic stacks, and greedy choice.
3. Linked structures and trees: linked-list reversal, fast and slow pointers,
   tree depth-first search, tree breadth-first search, binary search trees, and
   tries.
4. Graphs: graph traversal, grid traversal, topological sort, union-find, and
   shortest paths.
5. Choices and optimization: recursion, backtracking, one-dimensional dynamic
   programming, grid dynamic programming, knapsack dynamic programming, and
   bit manipulation.

The paths have a useful order, but the user may open any path or lesson.

## Lesson loop

Each lesson uses the same seven cards:

1. Spot it: clues that point to the pattern.
2. State it: the rule that must stay true while the code runs.
3. Write it: a short TypeScript recipe hidden until the user reveals it.
4. Trace it: a small input worked by hand.
5. Choose it: a contrast with patterns that look similar.
6. Use it: three practice problems with less help at each step.
7. Check it: time cost, memory cost, and the most common mistake.

The repeated shape will teach a method, not one saved answer.

## User experience

The Algorithms tab will open on a path overview. Each path card will show its
goal, lesson count, and saved progress. Opening a path will show its lessons in
order. Opening a lesson will show one card at a time with previous and next
controls.

The user may mark a lesson complete after reaching its check card. Completion
will be optional. The browser will save completed lesson IDs in local storage.
The user can clear all algorithm progress from the path overview.

The algorithm section will use TypeScript only. The system-term and
architecture sections will stay unchanged.

## Data and components

`src/server/flashcards.ts` will replace problem decks with typed path, lesson,
card, and practice-problem data. The existing authenticated server function
will return the new paths with the other two decks.

`src/routes/_authenticated.quiz.tsx` will own the selected path, lesson, and
card. Small local components will render the path overview, lesson list, lesson
card, code recipe, progress, and controls.

`src/algorithm-progress.ts` will own the versioned local-storage document. It
will ignore malformed or old data and return an empty set during server
rendering.

## Errors and tests

The existing load error will remain. A failed progress read or write will not
block study; the page will keep working without saved progress.

Content tests will check the path and lesson counts, unique IDs, seven-card
lesson order, TypeScript recipes, three practice problems, and required cost
notes. Progress tests will cover empty, saved, and malformed browser data.

`bun run check` will run tests, lint, types, and the production build. A browser
check will cover path selection, lesson navigation, recipe reveal, completion,
and progress reset.
