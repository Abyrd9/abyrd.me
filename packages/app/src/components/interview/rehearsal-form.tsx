import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Button } from "#/components/primitives/button";
import { Field } from "#/components/primitives/field";
import { Form } from "#/components/primitives/form";
import type {
	InterviewRehearsalPublic,
	ResponseField,
} from "#/server/interview";

const fieldDetails: Record<
	ResponseField,
	{ label: string; placeholder: string }
> = {
	plan: {
		label: "Plan",
		placeholder: "State the data structure or algorithm, then list the steps.",
	},
	code: {
		label: "Code",
		placeholder: "Write TypeScript or clear pseudocode.",
	},
	checks: {
		label: "Edge cases and cost",
		placeholder: "List edge cases, time cost, and memory cost.",
	},
	scope: {
		label: "Scope and questions",
		placeholder: "State the users, use cases, limits, and assumptions.",
	},
	estimates: {
		label: "Rough estimates",
		placeholder: "Estimate traffic, storage, and speed needs.",
	},
	architecture: {
		label: "Main design and key path",
		placeholder: "Name the parts, their data, and the main request path.",
	},
	tradeoffs: {
		label: "Failure and trade-offs",
		placeholder: "Explain failure behavior, data freshness, and cost choices.",
	},
	rolloutMetrics: {
		label: "Rollout and metrics",
		placeholder: "Describe a safe rollout and the signals you would watch.",
	},
};

type Values = Record<ResponseField, string>;

const defaultValues: Values = {
	plan: "",
	code: "",
	checks: "",
	scope: "",
	estimates: "",
	architecture: "",
	tradeoffs: "",
	rolloutMetrics: "",
};

type RehearsalFormProps = {
	rehearsal: InterviewRehearsalPublic;
	disabled?: boolean;
	onSubmit: (value: Values) => Promise<void>;
	onShowGuide: () => Promise<void>;
};

export function RehearsalForm({
	rehearsal,
	disabled = false,
	onSubmit,
	onShowGuide,
}: RehearsalFormProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm({
		defaultValues,
		onSubmit: async ({ value }) => {
			setSubmitError(null);

			if (!rehearsal.responseFields.some((field) => value[field].trim())) {
				setSubmitError("Write your answer before you open the guide.");
				return;
			}

			try {
				await onSubmit(value);
			} catch {
				setSubmitError("Could not load the guide. Try again.");
			}
		},
	});

	async function showGuide() {
		setSubmitError(null);

		try {
			await onShowGuide();
		} catch {
			setSubmitError("Could not load the guide. Try again.");
		}
	}

	return (
		<Form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			{rehearsal.responseFields.map((responseField) => {
				const details = fieldDetails[responseField];
				const isCode = responseField === "code";

				return (
					<form.Field key={responseField} name={responseField}>
						{(field) => (
							<Field.Root>
								<Field.Label htmlFor={field.name}>{details.label}</Field.Label>
								<textarea
									className={`min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 ${isCode ? "font-mono text-sm leading-6" : "leading-6"}`}
									disabled={disabled}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder={details.placeholder}
									rows={isCode ? 14 : 6}
									spellCheck={!isCode}
									value={field.state.value}
								/>
							</Field.Root>
						)}
					</form.Field>
				);
			})}

			{submitError ? (
				<p
					className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{submitError}
				</p>
			) : null}

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<div className="flex flex-wrap gap-3">
						<Button disabled={disabled || isSubmitting} type="submit">
							{isSubmitting ? "Loading guide…" : "Finish and show guide"}
						</Button>
						<Button
							className="bg-slate-200 text-slate-800 hover:bg-slate-300"
							disabled={disabled || isSubmitting}
							onClick={() => void showGuide()}
							type="button"
						>
							Show guide now
						</Button>
					</div>
				)}
			</form.Subscribe>
		</Form>
	);
}
