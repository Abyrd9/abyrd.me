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
					.catch(() => copyWithSelection(text))
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

// Some embedded browsers, including the OpenCode desktop app, deny the
// Clipboard API. Copying a selected textarea still works there.
const copyWithSelection = (text: string) => {
	const field = document.createElement("textarea");
	field.value = text;
	field.setAttribute("readonly", "");
	field.style.position = "fixed";
	field.style.opacity = "0";
	document.body.append(field);
	field.select();
	const copied = document.execCommand("copy");
	field.remove();
	if (!copied) throw new Error("Copy failed");
};
