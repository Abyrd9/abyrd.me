import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Button } from "#/components/primitives/button";
import { Field } from "#/components/primitives/field";
import { Form } from "#/components/primitives/form";
import type { StudyQuestionPublic } from "#/server/study";

type AnswerQuestion = Extract<
	StudyQuestionPublic,
	{ kind: "written" | "code" }
>;

type AnswerFormProps = {
	question: AnswerQuestion;
	disabled?: boolean;
	onSubmit: (answer: string) => Promise<void>;
};

export function AnswerForm({
	question,
	disabled = false,
	onSubmit,
}: AnswerFormProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: {
			answer: question.kind === "code" ? question.starterCode : "",
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);

			try {
				await onSubmit(value.answer);
			} catch {
				setSubmitError("Could not save your answer. Try again.");
			}
		},
	});

	const label =
		question.kind === "code"
			? `Your ${question.language} answer`
			: "Your answer";

	return (
		<Form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<form.Field
				name="answer"
				validators={{
					onChange: ({ value }) =>
						value.trim() ? undefined : "Write an answer first.",
				}}
			>
				{(field) => (
					<Field.Root invalid={field.state.meta.errors.length > 0}>
						<Field.Label htmlFor={field.name}>{label}</Field.Label>
						<textarea
							className={`min-h-36 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${question.kind === "code" ? "font-mono text-sm leading-6" : "leading-6"}`}
							disabled={disabled}
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={
								question.kind === "written" ? question.placeholder : undefined
							}
							rows={question.kind === "code" ? 14 : 7}
							spellCheck={question.kind !== "code"}
							value={field.state.value}
						/>
						{field.state.meta.errors[0] ? (
							<p className="text-sm text-red-700" role="alert">
								{field.state.meta.errors[0]}
							</p>
						) : null}
					</Field.Root>
				)}
			</form.Field>

			{submitError ? (
				<p
					className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{submitError}
				</p>
			) : null}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						disabled={disabled || !canSubmit || isSubmitting}
						type="submit"
					>
						{isSubmitting ? "Loading guide…" : "Show guide"}
					</Button>
				)}
			</form.Subscribe>
		</Form>
	);
}
