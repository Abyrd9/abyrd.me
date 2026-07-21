import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof BaseButton>;

export function Button({ className, ...props }: ButtonProps) {
	return (
		<BaseButton
			className={`inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
			{...props}
		/>
	);
}
