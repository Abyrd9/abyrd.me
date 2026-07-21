// Nav interactivity for injected nav
document.addEventListener("DOMContentLoaded", () => {
	// ─────────────────────────────────────────────────────────
	// Make logo a link if not on home page
	// ─────────────────────────────────────────────────────────
	const logo = document.getElementById("nav-logo");
	if (logo && window.location.pathname !== "/") {
		const link = document.createElement("a");
		link.href = "/";
		link.id = "nav-logo";
		link.className =
			"text-sm font-medium tracking-tight no-underline hover:text-slate-600 dark:hover:text-slate-400 transition-colors";
		link.textContent = "abyrd.me";
		logo.replaceWith(link);
	}

	// ─────────────────────────────────────────────────────────
	// Theme toggle
	// ─────────────────────────────────────────────────────────
	const toggle = document.getElementById("theme-toggle");
	const sunIcon = document.getElementById("sun-icon");
	const moonIcon = document.getElementById("moon-icon");

	function updateIcons() {
		const isDark = document.documentElement.classList.contains("dark");
		sunIcon?.classList.toggle("hidden", !isDark);
		moonIcon?.classList.toggle("hidden", isDark);
	}

	// Set initial icon state
	updateIcons();

	// Toggle on click
	toggle?.addEventListener("click", () => {
		const isDark = document.documentElement.classList.toggle("dark");
		localStorage.setItem("theme", isDark ? "dark" : "light");
		updateIcons();
	});
});
