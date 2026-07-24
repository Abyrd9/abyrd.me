import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	component: Home,
});

function Home() {
	return (
		<section className="flex flex-1 items-center py-16 sm:py-24">
			<div className="max-w-2xl">
				<p className="text-sm font-medium text-slate-500">Personal app</p>
				<h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
					Build the knowledge you use to solve hard problems.
				</h1>
				<p className="mt-5 text-lg leading-8 text-slate-600">
					Learn common system-design terms and review clear algorithm solutions
					in TypeScript and Go.
				</p>
				<Link
					className="mt-8 inline-flex min-h-10 items-center justify-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
					to="/quiz"
				>
					Start studying
				</Link>
			</div>
		</section>
	);
}
