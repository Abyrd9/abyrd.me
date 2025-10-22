/**
 * Custom Web Component: <bookmark-card>
 *
 * A link preview component that fetches and displays metadata from a URL.
 * Shows title, description, image, and domain with a beautiful card layout.
 *
 * Usage:
 *   <bookmark-card url="https://example.com"></bookmark-card>
 *
 * Attributes:
 *   - url: The URL to fetch metadata for (required)
 */

type LinkMetadata = {
  title: string;
  description: string;
  image: string | null;
  domain: string;
  url: string;
};

class BookmarkCard extends HTMLElement {
  private metadata: LinkMetadata | null = null;
  private loading = true;
  private error: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["url"];
  }

  connectedCallback() {
    const url = this.getAttribute("url");
    if (url) {
      this.fetchMetadata(url);
    } else {
      this.error = "No URL provided";
      this.render();
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "url" && oldValue !== newValue && newValue) {
      this.fetchMetadata(newValue);
    }
  }

  async fetchMetadata(url: string) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const response = await fetch(
        `/api/link-preview?url=${encodeURIComponent(url)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch metadata");
      }

      this.metadata = await response.json();
      this.loading = false;
      this.render();
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load preview";
      this.loading = false;
      this.render();
    }
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.opacity = "0";
    img.style.pointerEvents = "none";
  }

  render() {
    if (this.loading) {
      this.shadowRoot!.innerHTML = `
        <style>${this.getStyles()}</style>
        <div class="bookmark-card loading">
          <div class="loading-shimmer"></div>
          <div class="loading-content">
            <div class="loading-title"></div>
            <div class="loading-description"></div>
            <div class="loading-url"></div>
          </div>
        </div>
      `;
      return;
    }

    if (this.error || !this.metadata) {
      this.shadowRoot!.innerHTML = `
        <style>${this.getStyles()}</style>
        <div class="bookmark-card error">
          <div class="error-icon">⚠️</div>
          <div class="error-text">${
            this.error || "Could not load preview"
          }</div>
        </div>
      `;
      return;
    }

    const { title, description, image, domain, url } = this.metadata;

    this.shadowRoot!.innerHTML = `
      <style>${this.getStyles()}</style>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="bookmark-card">
        <div class="bookmark-content">
          <div class="bookmark-text">
            <div class="bookmark-title">${this.escapeHtml(title)}</div>
            <div class="bookmark-description">${this.escapeHtml(
              description
            )}</div>
            <div class="bookmark-url">
              <span class="domain-icon">🔗</span>
              ${this.escapeHtml(domain)}
            </div>
          </div>
          ${
            image
              ? `
            <div class="bookmark-image-wrapper">
              <div class="image-placeholder">
                <span class="placeholder-icon">🖼️</span>
              </div>
              <img 
                src="${this.escapeHtml(image)}" 
                alt="${this.escapeHtml(title)}"
                class="bookmark-image"
              />
            </div>
          `
              : `
            <div class="bookmark-image-wrapper">
              <div class="image-placeholder">
                <span class="placeholder-icon">🖼️</span>
              </div>
            </div>
          `
          }
        </div>
      </a>
    `;

    // Add load and error handlers for image
    const img = this.shadowRoot?.querySelector(".bookmark-image");
    if (img) {
      img.addEventListener("load", () => {
        img.classList.add("loaded");
      });
      img.addEventListener("error", this.handleImageError.bind(this));
    }
  }

  escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  getStyles(): string {
    return `
      :host {
        display: block;
        width: 100%;
      }

      .bookmark-card {
        display: block;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        overflow: hidden;
        text-decoration: none;
        color: #171717;
        cursor: pointer;
      }

      .bookmark-content {
        display: flex;
        gap: 1.5rem;
        padding: 1.5rem;
      }

      .bookmark-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .bookmark-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #171717;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .bookmark-description {
        font-size: 0.875rem;
        color: #737373;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .bookmark-url {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        color: #a3a3a3;
        margin-top: auto;
      }

      .domain-icon {
        font-size: 0.75rem;
      }

      .bookmark-image-wrapper {
        flex-shrink: 0;
        width: 160px;
        height: 120px;
        position: relative;
        overflow: hidden;
        border-radius: 8px;
        background: #f5f5f5;
        border: 1px solid #e5e5e5;
      }

      .bookmark-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 2;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        backface-visibility: hidden;
        transform: translateZ(0);
      }

      .bookmark-image.loaded {
        opacity: 1;
      }

      .image-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
        color: #d4d4d4;
        z-index: 1;
      }

      .placeholder-icon {
        font-size: 3rem;
        opacity: 0.5;
        filter: grayscale(100%);
      }

      /* Loading state */
      .bookmark-card.loading {
        background: #ffffff;
        padding: 1.5rem;
        cursor: default;
      }

      .bookmark-card.loading:hover {
        transform: none;
        border-color: #e5e5e5;
        box-shadow: none;
      }

      .loading-shimmer {
        width: 160px;
        height: 120px;
        background: linear-gradient(
          90deg,
          #f5f5f5 0%,
          #e5e5e5 50%,
          #f5f5f5 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
        float: right;
        margin-left: 1.5rem;
        border: 1px solid #e5e5e5;
      }

      .loading-content {
        flex: 1;
      }

      .loading-title,
      .loading-description,
      .loading-url {
        background: linear-gradient(
          90deg,
          #f5f5f5 0%,
          #e5e5e5 50%,
          #f5f5f5 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
        margin-bottom: 0.75rem;
      }

      .loading-title {
        height: 1.5rem;
        width: 70%;
      }

      .loading-description {
        height: 1rem;
        width: 90%;
      }

      .loading-url {
        height: 0.875rem;
        width: 40%;
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      /* Error state */
      .bookmark-card.error {
        background: #ffffff;
        border-color: #ef4444;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        cursor: default;
      }

      .bookmark-card.error:hover {
        transform: none;
        box-shadow: none;
      }

      .error-icon {
        font-size: 2rem;
      }

      .error-text {
        color: #dc2626;
        font-size: 0.875rem;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .bookmark-content {
          flex-direction: column-reverse;
        }

        .bookmark-image-wrapper {
          width: 100%;
          height: 160px;
        }

        .loading-shimmer {
          float: none;
          width: 100%;
          height: 160px;
          margin-left: 0;
          margin-bottom: 1rem;
        }
      }
    `;
  }
}

customElements.define("bookmark-card", BookmarkCard);

export default BookmarkCard;
