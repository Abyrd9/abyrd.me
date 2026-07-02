type Post = {
	slug: string;
	title: string;
	description: string;
	date: string;
	dateFormatted: string;
	path: string;
	tag?: string;
	tags?: string[];
};

class PostsList extends HTMLElement {
	private posts: Post[] = [];

	async connectedCallback() {
		await this.loadPosts();
	}

	async loadPosts() {
		try {
			const response = await fetch("/api/posts");
			if (!response.ok) {
				throw new Error("Failed to fetch posts");
			}

			this.posts = await response.json();
			this.render();
		} catch (error) {
			console.error("Error loading posts:", error);
			this.innerHTML = '<p class="text-slate-500">Failed to load posts.</p>';
		}
	}

	private getPostTags(post: Post): string[] {
		if (Array.isArray(post.tags) && post.tags.length > 0) {
			return post.tags;
		}

		return post.tag ? [post.tag] : [];
	}

	private getTagClass(tag: string): string {
		const tagKey = tag.trim().toLowerCase();

		if (tagKey === "ai") {
			return "tag-highlight tag-highlight-ai";
		}

		if (tagKey === "web development" || tagKey === "webdev") {
			return "tag-highlight tag-highlight-webdev";
		}

		return "tag-highlight";
	}

	render() {
		if (this.posts.length === 0) {
			this.innerHTML = '<p class="text-slate-500">No posts yet.</p>';
			return;
		}

		this.innerHTML = /* html */ `
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-medium tracking-tight">Recent Posts</h2>
        </div>
        <ul class="flex flex-col">
          ${this.posts
						.map(
							(post) => `
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
                    ${this.getPostTags(post)
											.map(
												(tag, index) => `
                      <span class="${this.getTagClass(tag)}" style="margin-left: ${index === 0 ? "0px" : "2px"};">${tag}</span>
                    `,
											)
											.join("")}
                  </div>
                </article>
              </a>
            </li>
          `,
						)
						.join("")}
        </ul>
      </section>
    `;
	}
}

if (!customElements.get("posts-list")) {
	customElements.define("posts-list", PostsList);
}

export default PostsList;
