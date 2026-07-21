import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/primitives/button";
import { Field } from "#/components/primitives/field";
import { Form } from "#/components/primitives/form";
import { getSession, submitSignIn } from "#/server/auth-functions";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		const session = await getSession();

		if (session.isSignedIn) throw redirect({ to: "/" });
	},
	component: SignInPage,
});

function SignInPage() {
	const router = useRouter();
	const [signInError, setSignInError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setSignInError(null);

			const result = await submitSignIn({ data: value });

			if (!result.ok) {
				setSignInError("The username or password is incorrect.");
				return;
			}

			await router.navigate({ to: "/" });
		},
	});

	return (
		<main className="grid min-h-dvh place-items-center px-6 py-12">
			<section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
				<a
					className="text-sm font-semibold tracking-tight text-slate-950"
					href="https://abyrd.me"
				>
					Andrew Byrd
				</a>
				<h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-950">
					Sign in
				</h1>
				<p className="mt-2 text-sm leading-6 text-slate-600">
					This space is for Andrew’s personal tools.
				</p>

				<Form
					className="mt-8"
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.Field
						name="username"
						validators={{
							onSubmit: ({ value }) =>
								value.trim() ? undefined : "Enter your username.",
						}}
					>
						{(field) => (
							<Field.Root invalid={field.state.meta.errors.length > 0}>
								<Field.Label htmlFor={field.name}>Username</Field.Label>
								<Field.Control
									autoComplete="username"
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

					<form.Field
						name="password"
						validators={{
							onSubmit: ({ value }) =>
								value ? undefined : "Enter your password.",
						}}
					>
						{(field) => (
							<Field.Root invalid={field.state.meta.errors.length > 0}>
								<Field.Label htmlFor={field.name}>Password</Field.Label>
								<Field.Control
									autoComplete="current-password"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									type="password"
									value={field.state.value}
								/>
								<Field.Error>{field.state.meta.errors[0]}</Field.Error>
							</Field.Root>
						)}
					</form.Field>

					{signInError ? (
						<p
							className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
							role="alert"
						>
							{signInError}
						</p>
					) : null}

					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button disabled={isSubmitting} type="submit">
								{isSubmitting ? "Signing in…" : "Sign in"}
							</Button>
						)}
					</form.Subscribe>
				</Form>
			</section>
		</main>
	);
}
