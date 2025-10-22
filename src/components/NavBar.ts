class NavBar extends HTMLElement {
  connectedCallback() {
    this.render();
  }
  render() {
    const host = window.location.origin;
    this.innerHTML = /* html */`
      <nav
        class="w-full py-6 flex justify-between items-center border-b border-slate-200 mb-12 mx-auto max-w-3xl"
      >
        <h3 class="text-sm font-medium tracking-tight">abyrd.me</h3>

        <ul class="flex items-center">
          <li>
            <a
              href="https://x.com/Abyrd_9"
              class="opacity-60 hover:opacity-100 w-7 h-8 flex items-center justify-center rounded-lg transition-opacity"
              aria-label="X (Twitter)"
            >
              <img src="${host}/api/images/logos/x-logo-black.png" alt="" class="h-3 w-auto" />
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/andrew-byrd-b5142a96/"
              class="opacity-60 hover:opacity-100 w-7 h-8 flex items-center justify-center rounded-lg transition-opacity"
              aria-label="LinkedIn"
            >
              <img src="${host}/api/images/logos/linkedin-logo-black.png" alt="" class="h-4 w-auto" />
            </a>
          </li>
          <li>
            <a
              href="https://github.com/Abyrd9"
              class="opacity-60 hover:opacity-100 w-7 h-8 flex items-center justify-center rounded-lg transition-opacity"
              aria-label="GitHub"
            >
              <img src="${host}/api/images/logos/github-logo-black.png" alt="" class="h-4 w-auto" />
            </a>
          </li>
        </ul>
      </nav>
    `;
  }
}

customElements.define("nav-bar", NavBar);

export default NavBar;
