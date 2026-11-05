import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof BaseButton>;

export function Button({ className, ...props }: ButtonProps) {
	return (
		<BaseButton
			className={`inline-flex min-h-9 items-center justify-center rounded-md bg-slate-100 px-3 text-sm font-normal text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
			{...props}
		/>
	);
}
