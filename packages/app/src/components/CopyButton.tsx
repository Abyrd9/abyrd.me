import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";

export const CopyButton = ({
	label,
	text,
}: {
	/** Visible button text, such as "Copy quote". */
	label: string;
	text: string;
}) => {
	const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

	useEffect(() => {
		if (status === "idle") return;
		const timer = window.setTimeout(() => setStatus("idle"), 2000);
		return () => window.clearTimeout(timer);
	}, [status]);

	return (
		<Button
			aria-live="polite"
			disabled={!text}
			onClick={() =>
				void navigator.clipboard
					.writeText(text)
					.then(() => setStatus("copied"))
					.catch(() => setStatus("failed"))
			}
			type="button"
		>
			{status === "copied"
				? "Copied"
				: status === "failed"
					? "Could not copy"
					: label}
		</Button>
	);
};
