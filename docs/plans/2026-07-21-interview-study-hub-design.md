# Interview Study Hub Design

## Goal

Add a protected study area to `@abyrd/app` for daily, on-demand FAANG-style interview practice and guided learning. It covers algorithms, system design, programming fundamentals, and web development without adding database infrastructure.

## User experience

- The app dashboard links to `/quiz`.
- **Daily focus** is a deterministic, balanced set derived from the current local calendar day. Reopening it on the same day resumes the same browser-local work.
- **Practice another set** creates an additional shuffled set at any time.
- A session supports flashcards, multiple-choice questions, written answers, and code answers.
- Flashcards reveal their answer and accept a self-rating. Multiple-choice answers are graded immediately. Written and code answers are retained locally, then the app reveals a reference answer, rubric, and explanation for self-review.
- The study hub also lists guided courses. A course is a short sequence of explanation/checkpoint lessons and ends in a mixed-mode assessment.

## Declarative content model

Question and course data live in a server-only content module. A `StudyQuestion` discriminated union represents the four interaction modes. Shared metadata (topic, difficulty, explanation, tags) keeps selection and presentation generic.

`StudyCourse` is declarative: title, summary, outcomes, ordered lesson blocks, and a final assessment question list. Lesson blocks are typed content (`concept`, `checkpoint`, or `challenge`), so adding a course is data authoring rather than route or component work.

The first two tracks are:

1. **Design a URL Shortener**: requirements, estimates, API/data model, architecture, and trade-offs, followed by an assessment.
2. **Master the Sliding Window**: pattern recognition, invariant derivation, a hard-style challenge, and a final assessment.

## Architecture

- `src/server/study.ts` owns question/course content, deterministic session selection, DTO creation, and answer evaluation.
- Effect v3 models the domain program and typed missing/invalid-question errors. It remains server-side and is run at the server-function boundary.
- `src/server/study-functions.ts` exposes authenticated TanStack Start server functions for loading sessions, revealing flashcards, evaluating answers, and loading course material. Answer keys and reference solutions stay on the server until reveal/evaluation.
- A pathless `src/routes/_authenticated.tsx` layout owns the session check in `beforeLoad`, shared private app shell, and sign-out action. The dashboard and `/quiz` become its children, so future private routes inherit authentication automatically. `/sign-in` and the Railway `/health` probe stay public.
- React holds only visible UI state; durable local progress is isolated behind a small local-storage helper.
- Reusable UI components render all question types and course blocks. TanStack Form owns written and code submission state and validation.

## Persistence and safety

There is intentionally no database in version one. Browser local storage records daily session identity, selected questions, submitted answers, flashcard ratings, course progress, and completed course assessments. It is scoped to this browser and can be cleared by the user.

The pathless route guards private UI, and every study server function independently requires the signed-in session. Server-only content prevents answer keys from being bundled into the browser before the user requests feedback.

## Verification

- Bun tests cover deterministic daily selection, fresh-set variation, balanced topic/mode selection, answer evaluation, course lookup, and course completion data.
- `bun run check` and `bun run build` validate TypeScript, linting, formatting, tests, and production output.
- A browser smoke test verifies authentication protection, daily practice, each question mode, fresh practice, course progression, and the final assessment.
