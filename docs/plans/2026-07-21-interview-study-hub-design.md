# Interview Simulator Design

## Goal

Turn the private study area into a senior and staff interview simulator. It
will help Andrew learn, practise, explain, and repeat the work that interviews
test.

The app will begin with 20 core rehearsals: 10 coding problems and 10 system
design problems. It will also include a small set of dated technical review
cards. Each card will link to its source and explain why the fact matters in a
design discussion.

## What the research changes

The app will not use random facts as its main activity. Practice testing and
spaced practice have strong support for long-term learning. The daily session
will therefore ask for an answer before it shows help, give clear feedback,
and bring the same work back after a delay.

System design will follow one repeatable order: define the problem, estimate
the load, give a high-level design, explain the key path, then discuss limits
and trade-offs. This order comes from the System Design Primer's interview
framework.

Sources:

- [Practice testing and spaced practice](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html/comment-page-1)
- [System design interview framework](https://github.com/donnemartin/system-design-primer)
- [LeetCode interview topics](https://leetcode.com/discuss/study-guide/2580423/New-Data-Structures-and-Algorithms-CONTENT%21/)

## Core rehearsals

### Coding

1. Two Sum — hash map
2. Valid Parentheses — stack
3. Longest Substring Without Repeating Characters — sliding window
4. Merge Intervals — sorting and interval rules
5. Search in Rotated Sorted Array — binary search
6. Reverse Linked List — pointers
7. Binary Tree Level Order Traversal — tree traversal
8. Number of Islands — graph traversal
9. Course Schedule — graph order and cycle checks
10. Coin Change — dynamic programming

### System design

1. URL shortener
2. Rate limiter
3. News feed
4. Chat service
5. File storage and sync
6. Notification platform
7. Job scheduler
8. Metrics and logging platform
9. Collaborative document editor
10. Feature-flag and experiment platform

Each rehearsal will have a base version and senior/staff follow-ups. The
follow-ups will cover failure, data freshness, cost, rollout, observability,
and team boundaries. They will not add complexity unless the problem needs it.

## Practice flow

The app is a library, not a schedule. A user can open any coding or
system-design rehearsal at any time.

Each rehearsal shows its guide on request. Writing an answer remains available
for practice, but it does not block the guide or record completion.

### Coding rehearsal

1. Read the problem and ask any needed questions.
2. Write a short plan.
3. Code against the prompt under a timer.
4. State edge cases and time and memory cost.
5. Compare the work with a solution and a checklist.
6. Record the reason for any miss.

### System-design rehearsal

1. Ask about users, use cases, limits, and success measures.
2. Estimate traffic, storage, and speed needs.
3. Write the main parts and their connections.
4. Explain the key request path.
5. Discuss failure, data freshness, cost, rollout, and metrics.
6. Compare the work with a staff-level checklist and record any miss.

The app will use short, direct prose. It will define a technical term before
it relies on it.

## Current technical review cards

The app will not fetch or summarise a general news feed. News ages quickly and
does not make a good daily interview task.

Instead, an authored review card will contain:

- A question that asks for one useful fact.
- A short answer in plain language.
- Why the fact changes a design choice.
- A source name and link.
- The date the card was checked.


Cards will use official product documentation, standards, and engineering
posts. The card shows when its author last checked the source.

## Architecture

`src/server/study.ts` will replace the loose question bank with declarative
rehearsal content. A rehearsal will hold its track, prompt, time limit,
clarifying questions, answer fields, solution, checklist, common misses, and
senior/staff follow-ups.

System-design rehearsals will use named answer sections rather than one large
text box. The sections will match the interview flow: scope, estimates, main
design, key path, trade-offs, rollout, and metrics. Coding rehearsals will use
plan, code, edge cases, and complexity sections.

The authenticated `/quiz` route will become the simulator home. It will have:

- Coding: the 10-problem catalog.
- System design: the 10-problem catalog.
- Keep current: dated source-backed review cards.

The existing pathless authenticated layout and server-side answer protection
will remain in place.

## Error handling and safety

The server will reject unknown rehearsal and card IDs. It will not send a
solution or checklist until the user asks to see it.

## Verification

- Content tests will confirm all 20 rehearsals load and their solutions stay
  private before reveal.
- Route tests will cover the catalogs, coding form, design form, source-card
  dates, and authenticated server functions.
- `bun run check` will run tests, formatting, types, and production builds.
- A browser smoke test will cover a coding rehearsal, a design rehearsal, and
  a dated technical card.
