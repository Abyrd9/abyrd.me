import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";

const themeStorageKey = "abyrd-app-theme";

type Theme = "light" | "dark";

export function ThemeInitializer() {
	useEffect(() => {
		applyTheme(getPreferredTheme());
	}, []);

	return null;
}

export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => {
		setTheme(getPreferredTheme());
	}, []);

	function toggleTheme() {
		const nextTheme: Theme = theme === "dark" ? "light" : "dark";
		applyTheme(nextTheme);
		setTheme(nextTheme);
	}

	return (
		<Button
			aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
			aria-pressed={theme === "dark"}
			className="min-h-9 size-9 rounded-full bg-slate-100 p-0 text-lg leading-none hover:bg-slate-200"
			onClick={toggleTheme}
			title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
			type="button"
		>
			<span aria-hidden="true">{theme === "dark" ? "☀︎" : "☾"}</span>
			<span className="sr-only">
				Switch to {theme === "dark" ? "light" : "dark"} mode
			</span>
		</Button>
	);
}

function getPreferredTheme(): Theme {
	try {
		const savedTheme = window.localStorage.getItem(themeStorageKey);
		if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
	} catch {
		// Fall through to the device setting when browser storage is unavailable.
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");

	try {
		window.localStorage.setItem(themeStorageKey, theme);
	} catch {
		// The current choice still works when browser storage is unavailable.
	}
}
