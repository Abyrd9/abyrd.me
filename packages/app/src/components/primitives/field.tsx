import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentProps } from "react";

function Root({ className, ...props }: ComponentProps<typeof BaseField.Root>) {
	return (
		<BaseField.Root className={`grid gap-1.5 ${className ?? ""}`} {...props} />
	);
}

function Label({
	className,
	...props
}: ComponentProps<typeof BaseField.Label>) {
	return (
		<BaseField.Label
			className={`text-sm font-medium text-slate-700 ${className ?? ""}`}
			{...props}
		/>
	);
}

function Control({
	className,
	...props
}: ComponentProps<typeof BaseField.Control>) {
	return (
		<BaseField.Control
			className={`min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200 data-[invalid]:border-red-500 ${className ?? ""}`}
			{...props}
		/>
	);
}

function FieldError({
	className,
	...props
}: ComponentProps<typeof BaseField.Error>) {
	return (
		<BaseField.Error
			className={`text-sm text-red-700 ${className ?? ""}`}
			{...props}
		/>
	);
}

export const Field = {
	Root,
	Label,
	Control,
	Error: FieldError,
};
