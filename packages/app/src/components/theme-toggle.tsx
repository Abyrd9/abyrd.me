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
			className="min-w-20 bg-slate-200 text-slate-800 hover:bg-slate-300"
			onClick={toggleTheme}
			type="button"
		>
			{theme === "dark" ? "Light mode" : "Dark mode"}
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
