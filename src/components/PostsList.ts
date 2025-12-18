type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  dateFormatted: string;
  path: string;
  tag?: string;
}

class PostsList extends HTMLElement {
  private posts: Post[] = [];
  private selectedTag: string | null = null;
  private searchQuery: string = '';

  async connectedCallback() {
    await this.loadPosts();
    this.addEventListener('click', this.handleClick.bind(this));
    this.addEventListener('input', this.handleInput.bind(this));
  }

  handleClick(e: Event) {
    const target = e.target as HTMLElement;
    const button = target.closest('button[data-tag]');
    if (button) {
      const tag = button.getAttribute('data-tag');
      this.selectedTag = tag === 'all' ? null : tag;
      this.render();
    }
  }

  handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.id === 'post-search') {
      this.searchQuery = target.value.toLowerCase();
      this.render();
      // Restore focus and cursor position after re-render
      const input = this.querySelector('#post-search') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }

  async loadPosts() {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      this.posts = await response.json();
      this.render();
    } catch (error) {
      console.error('Error loading posts:', error);
      this.innerHTML = '<p class="text-slate-500">Failed to load posts.</p>';
    }
  }

  render() {
    if (this.posts.length === 0) {
      this.innerHTML = '<p class="text-slate-500">No posts yet.</p>';
      return;
    }

    const tags = Array.from(new Set(this.posts.map(p => p.tag).filter(Boolean))) as string[];

    let filteredPosts = this.posts;

    // Filter by tag
    if (this.selectedTag) {
      filteredPosts = filteredPosts.filter(p => p.tag === this.selectedTag);
    }

    // Filter by search query
    if (this.searchQuery) {
      filteredPosts = filteredPosts.filter(p =>
        p.title.toLowerCase().includes(this.searchQuery) ||
        p.description.toLowerCase().includes(this.searchQuery)
      );
    }

    this.innerHTML = /* html */`
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-medium tracking-tight">Recent Posts</h2>
          <!-- TODO: Uncomment tag filters when you have more posts
          ${tags.length > 0 ? `
            <div class="flex gap-2">
              <button 
                data-tag="all"
                class="text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer border ${!this.selectedTag ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}"
              >
                All
              </button>
              ${tags.map(tag => `
                <button 
                  data-tag="${tag}"
                  class="text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer border ${this.selectedTag === tag ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}"
                >
                  ${tag}
                </button>
              `).join('')}
            </div>
          ` : ''}
          -->
        </div>
        <!-- TODO: Uncomment search when you have more posts
        <div class="mb-4">
          <input 
            type="text" 
            id="post-search"
            placeholder="Search posts..."
            value="${this.searchQuery}"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        -->
        <ul class="flex flex-col">
          ${filteredPosts.map(post => `
            <li class="mb-4">
              <a href="${post.path}" class="block group">
                <article class="rounded-lg transition-colors">
                  <h3 class="text-lg font-medium tracking-tight transition-colors my-0 flex items-center gap-2 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                    - ${post.title}
                  </h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <time class="text-sm text-slate-500 dark:text-slate-400 mt-1 block" datetime="${post.date}">
                      ${post.dateFormatted}
                    </time>
                    ${post.tag ? `<span class="tag-highlight">${post.tag}</span>` : ''}
                  </div>
                </article>
              </a>
            </li>
          `).join('')}
        </ul>
        ${filteredPosts.length === 0 ? '<p class="text-slate-500 italic mt-4">No posts found.</p>' : ''}
      </section>
    `;
  }
}

if (!customElements.get("posts-list")) {
  customElements.define("posts-list", PostsList);
}

export default PostsList;

