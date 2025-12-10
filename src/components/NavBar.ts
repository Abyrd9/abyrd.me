class NavBar extends HTMLElement {
  connectedCallback() {
    this.render();
    this.setupThemeToggle();
  }

  setupThemeToggle() {
    const toggle = this.querySelector('#theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateToggleIcon();
      });
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.classList.toggle('dark', e.matches);
        this.updateToggleIcon();
      }
    });
  }

  updateToggleIcon() {
    const sunIcon = this.querySelector('#sun-icon');
    const moonIcon = this.querySelector('#moon-icon');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('hidden', !isDark);
      moonIcon.classList.toggle('hidden', isDark);
    }
  }

  render() {
    const host = window.location.origin;
    const isHome = window.location.pathname === "/";
    const isDark = document.documentElement.classList.contains('dark');
    
    const logoContent = isHome 
      ? `<span class="text-sm font-medium tracking-tight">abyrd.me</span>`
      : `<a href="/" class="text-sm font-medium tracking-tight no-underline hover:text-slate-600 dark:hover:text-slate-400 transition-colors">abyrd.me</a>`;
    
    this.innerHTML = /* html */`
      <nav
        class="w-full py-6 flex justify-between items-center border-b border-slate-200 dark:border-neutral-800 mb-12 mx-auto max-w-3xl px-6"
      >
        ${logoContent}

        <div class="flex items-center">
          <ul class="flex items-center">
            <li>
              <a
                href="https://x.com/Abyrd_9"
                class="opacity-60 hover:opacity-100 w-7 h-8 flex items-center justify-center rounded-lg transition-opacity"
                aria-label="X (Twitter)"
              >
                <img src="${host}/api/images/logos/x-logo-black.png" alt="" class="h-3 w-auto invert-on-dark" />
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/andrew-byrd-b5142a96/"
                class="opacity-60 hover:opacity-100 w-7 h-8 flex items-center justify-center rounded-lg transition-opacity"
                aria-label="LinkedIn"
              >
                <img src="${host}/api/images/logos/linkedin-logo-black.png" alt="" class="h-4 w-auto invert-on-dark" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Abyrd9"
                class="opacity-60 hover:opacity-100 w-7 h-8 flex items-center justify-center rounded-lg transition-opacity"
                aria-label="GitHub"
              >
                <img src="${host}/api/images/logos/github-logo-black.png" alt="" class="h-4 w-auto invert-on-dark" />
              </a>
            </li>
          </ul>

          <!-- Divider -->
          <div class="w-px h-5 bg-slate-200 dark:bg-neutral-700 mx-3"></div>

          <!-- Theme Toggle -->
          <button
            id="theme-toggle"
            class="w-8 h-8 flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Toggle dark mode"
          >
            <!-- Sun icon (shown in dark mode) -->
            <svg id="sun-icon" class="${isDark ? '' : 'hidden'}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <!-- Moon icon (shown in light mode) -->
            <svg id="moon-icon" class="${isDark ? 'hidden' : ''}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </button>
        </div>
      </nav>
    `;
  }
}

customElements.define("nav-bar", NavBar);

export default NavBar;
