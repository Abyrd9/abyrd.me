class FooterBar extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const currentYear = new Date().getFullYear();

    this.innerHTML = /* html */`
      <footer class="w-full mt-16 text-gray-500 py-5 px-8 text-center bg-gray-100/50">
        <div class="footer-content max-w-3xl mx-auto flex justify-between items-center">
          <span class="text-xs">Built with Bun & Web Components.</span>
          <div class="copyright text-xs opacity-70">
            © ${currentYear}
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define("footer-bar", FooterBar);

export default FooterBar;
