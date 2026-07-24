import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof BaseButton>;

export function Button({ className, ...props }: ButtonProps) {
	return (
		<BaseButton
			className={`inline-flex min-h-10 items-center justify-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
			{...props}
		/>
	);
}
