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
					A private space for useful practice.
				</h1>
				<p className="mt-5 text-lg leading-8 text-slate-600">
					Build interview fluency with daily prompts, honest answer review, and
					guided courses for the problems worth remembering.
				</p>
				<Link
					className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
					to="/quiz"
				>
					Open interview study
				</Link>
			</div>
		</section>
	);
}
