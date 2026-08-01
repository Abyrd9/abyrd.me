import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";
import { Field } from "#/components/primitives/field";
import { Form } from "#/components/primitives/form";
import {
	createQuote,
	deleteQuote,
	loadQuotes,
	updateQuote,
} from "#/server/quotes-functions";

export const Route = createFileRoute("/_authenticated/quotes")({
	component: QuotesLibrary,
});

type Quote = Awaited<ReturnType<typeof loadQuotes>>[number];

type QuoteFields = {
	text: string;
	attribution: string;
	sourceUrl: string;
	sourceNote: string;
};

const emptyQuote: QuoteFields = {
	text: "",
	attribution: "",
	sourceUrl: "",
	sourceNote: "",
};

function QuotesLibrary() {
	const [quotes, setQuotes] = useState<Quote[]>([]);
	const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
	const [deleteCandidate, setDeleteCandidate] = useState<Quote | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const form = useForm({
		defaultValues: emptyQuote,
		onSubmit: async ({ value }) => {
			setMessage(null);

			try {
				if (editingQuote) {
					const quote = await updateQuote({
						data: { id: editingQuote.id, ...value },
					});

					if (!quote) throw new Error("Quote was not found.");

					setQuotes((current) =>
						current.map((item) => (item.id === quote.id ? quote : item)),
					);
					setEditingQuote(null);
				} else {
					const quote = await createQuote({ data: value });
					setQuotes((current) => [quote, ...current]);
				}

				form.reset(emptyQuote);
			} catch {
				setMessage("Could not save that quote. Please try again.");
			}
		},
	});

	useEffect(() => {
		void loadQuotes()
			.then(setQuotes)
			.catch(() =>
				setMessage("Could not load your quotes. Refresh and try again."),
			);
	}, []);

	function startEditing(quote: Quote) {
		setEditingQuote(quote);
		setDeleteCandidate(null);
		setMessage(null);
		form.reset(toFields(quote));
	}

	function cancelEditing() {
		setEditingQuote(null);
		form.reset(emptyQuote);
	}

	async function confirmDelete(quote: Quote) {
		setMessage(null);

		try {
			await deleteQuote({ data: { id: quote.id } });
			setQuotes((current) => current.filter((item) => item.id !== quote.id));
			setDeleteCandidate(null);

			if (editingQuote?.id === quote.id) cancelEditing();
		} catch {
			setMessage("Could not delete that quote. Please try again.");
		}
	}

	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Quote library
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Keep the words you want to find again.
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					Save a line, where it came from, and any context you want to keep with
					it.
				</p>
			</div>

			<section className="mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold tracking-tight text-slate-950">
							{editingQuote ? "Edit quote" : "Add a quote"}
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							The quote itself is required. Everything else is optional.
						</p>
					</div>
					{editingQuote ? (
						<Button onClick={cancelEditing} type="button">
							Cancel edit
						</Button>
					) : null}
				</div>

				<Form
					className="mt-6"
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					<form.Field
						name="text"
						validators={{
							onSubmit: ({ value }) =>
								value.trim() ? undefined : "Enter the quote you want to save.",
						}}
					>
						{(field) => (
							<Field.Root invalid={field.state.meta.errors.length > 0}>
								<Field.Label htmlFor={field.name}>Quote</Field.Label>
								<textarea
									className="min-h-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder="Write the line you want to remember."
									value={field.state.value}
								/>
								<Field.Error>{field.state.meta.errors[0]}</Field.Error>
							</Field.Root>
						)}
					</form.Field>

					<div className="grid gap-5 sm:grid-cols-2">
						<form.Field name="attribution">
							{(field) => (
								<Field.Root invalid={field.state.meta.errors.length > 0}>
									<Field.Label htmlFor={field.name}>Attribution</Field.Label>
									<Field.Control
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										value={field.state.value}
									/>
									<Field.Error>{field.state.meta.errors[0]}</Field.Error>
								</Field.Root>
							)}
						</form.Field>
						<form.Field name="sourceUrl">
							{(field) => (
								<Field.Root invalid={field.state.meta.errors.length > 0}>
									<Field.Label htmlFor={field.name}>Web reference</Field.Label>
									<Field.Control
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder="https://example.com"
										type="url"
										value={field.state.value}
									/>
									<Field.Error>{field.state.meta.errors[0]}</Field.Error>
								</Field.Root>
							)}
						</form.Field>
					</div>
					<form.Field name="sourceNote">
						{(field) => (
							<Field.Root invalid={field.state.meta.errors.length > 0}>
								<Field.Label htmlFor={field.name}>Source note</Field.Label>
								<Field.Control
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder="A book, conversation, or your own context"
									value={field.state.value}
								/>
								<Field.Error>{field.state.meta.errors[0]}</Field.Error>
							</Field.Root>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button disabled={!canSubmit || isSubmitting} type="submit">
								{isSubmitting
									? "Saving…"
									: editingQuote
										? "Save changes"
										: "Save quote"}
							</Button>
						)}
					</form.Subscribe>
				</Form>
			</section>

			{message ? (
				<p
					className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
					role="alert"
				>
					{message}
				</p>
			) : null}

			<section className="mt-8 max-w-3xl">
				<div className="flex items-baseline justify-between gap-4">
					<h2 className="text-lg font-semibold tracking-tight text-slate-950">
						Saved quotes
					</h2>
					<p className="text-sm text-slate-600">
						{quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
					</p>
				</div>
				<div className="mt-4 grid gap-4">
					{quotes.map((quote) => (
						<article
							className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
							key={quote.id}
						>
							<blockquote className="text-lg leading-8 text-slate-950">
								“{quote.text}”
							</blockquote>
							{quote.attribution ? (
								<p className="mt-4 text-sm font-medium text-slate-700">
									— {quote.attribution}
								</p>
							) : null}
							{quote.sourceUrl ? (
								<a
									className="mt-3 inline-flex text-sm font-medium text-slate-950 underline underline-offset-4"
									href={quote.sourceUrl}
									rel="noreferrer"
									target="_blank"
								>
									Open web reference
								</a>
							) : null}
							{quote.sourceNote ? (
								<p className="mt-3 text-sm leading-6 text-slate-600">
									{quote.sourceNote}
								</p>
							) : null}
							<div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
								<Button onClick={() => startEditing(quote)} type="button">
									Edit
								</Button>
								{deleteCandidate?.id === quote.id ? (
									<>
										<span className="text-sm text-slate-600">
											Delete this quote permanently?
										</span>
										<Button
											className="bg-red-700 text-white hover:bg-red-800"
											onClick={() => void confirmDelete(quote)}
											type="button"
										>
											Delete quote
										</Button>
										<Button
											onClick={() => setDeleteCandidate(null)}
											type="button"
										>
											Cancel
										</Button>
									</>
								) : (
									<Button
										onClick={() => setDeleteCandidate(quote)}
										type="button"
									>
										Delete
									</Button>
								)}
							</div>
						</article>
					))}
					{quotes.length === 0 ? (
						<p className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-sm leading-6 text-slate-600">
							No saved quotes yet. Add the first one above.
						</p>
					) : null}
				</div>
			</section>
		</section>
	);
}

function toFields(quote: Quote): QuoteFields {
	return {
		text: quote.text,
		attribution: quote.attribution ?? "",
		sourceUrl: quote.sourceUrl ?? "",
		sourceNote: quote.sourceNote ?? "",
	};
}
