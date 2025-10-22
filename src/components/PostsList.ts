type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  dateFormatted: string;
  path: string;
}

class PostsList extends HTMLElement {
  async connectedCallback() {
    await this.loadPosts();
  }

  async loadPosts() {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const posts: Post[] = await response.json();
      this.render(posts);
    } catch (error) {
      console.error('Error loading posts:', error);
      this.innerHTML = '<p class="text-slate-500">Failed to load posts.</p>';
    }
  }

  render(posts: Post[]) {
    if (posts.length === 0) {
      this.innerHTML = '<p class="text-slate-500">No posts yet.</p>';
      return;
    }

    this.innerHTML = /* html */`
      <section class="space-y-4">
        <h2 class="text-xl font-medium tracking-tight">Recent Posts</h2>
        <ul class="flex flex-col gap-4">
          ${posts.map(post => `
            <li>
              <a href="${post.path}" class="block group">
                <article class="p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <h3 class="text-lg font-medium tracking-tight group-hover:text-blue-600 transition-colors">
                    ${post.title}
                  </h3>
                  <time class="text-sm text-slate-500 mt-1 block" datetime="${post.date}">
                    ${post.dateFormatted}
                  </time>
                  ${post.description ? `
                    <p class="text-slate-600 mt-2 text-sm">
                      ${post.description}
                    </p>
                  ` : ''}
                </article>
              </a>
            </li>
          `).join('')}
        </ul>
      </section>
    `;
  }
}

customElements.define("posts-list", PostsList);

export default PostsList;

