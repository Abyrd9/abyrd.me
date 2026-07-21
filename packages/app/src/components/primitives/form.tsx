import { Form as BaseForm } from "@base-ui/react/form";
import type { ComponentProps } from "react";

export function Form({ className, ...props }: ComponentProps<typeof BaseForm>) {
	return <BaseForm className={`grid gap-5 ${className ?? ""}`} {...props} />;
}
