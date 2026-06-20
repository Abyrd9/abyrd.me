### Creating Blog Posts

When creating a new blog post, follow these steps:

## 1. File Naming Convention

Name the file starting with the date in `YYYY-MM-DD` format, followed by a slug:

```
src/posts/YYYY-MM-DD-post-slug.html
```

Example: `src/posts/2025-12-03-my-new-post.html`

## 2. Required HTML Structure

Every blog post must include these elements. Note: nav and footer are **automatically injected** by the Bun plugin at build time.

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Prevent flash of wrong theme - must run before CSS -->
  <script>((s,p)=>(s=localStorage.getItem("theme"),p=matchMedia("(prefers-color-scheme:dark)").matches,(s==="dark"||(!s&&p))&&document.documentElement.classList.add("dark")))()</script>
  <!-- Required: Open Graph meta tags for post list -->
  <meta property="og:title" content="Your Post Title" />
  <meta property="og:description" content="A brief description of your post." />
  <!-- Optional: Tag for filtering (e.g., "dev", "personal", etc.) -->
  <meta property="article:tag" content="dev" />
  <link rel="stylesheet" href="../index.css" />
  <script type="module" src="../shared/theme-toggle.ts"></script>
  <title>Your Post Title - abyrd.me</title>
</head>

<body class="w-full min-h-dvh flex flex-col p-0">
  <!-- Nav is injected here by plugin -->
  <div id="nav-bar"></div>

  <main class="mx-auto max-w-2xl pb-16 flex-1 px-6">
    <article>
      <header class="mb-8">
        <!-- Mobile back link (hidden on desktop) -->
        <a href="/"
          class="sm:hidden inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 no-underline mb-5 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </a>
        <h1 class="text-3xl font-bold tracking-tight mb-4">Your Post Title</h1>
        <!-- Required: datetime attribute is used for sorting, text content is displayed -->
        <time datetime="YYYY-MM-DD" class="text-slate-500 dark:text-slate-400">Month DD, YYYY</time>
      </header>

      <div class="prose prose-slate">
        <!-- Your post content here -->
        <p>Your content...</p>
      </div>
    </article>
  </main>

  <!-- Footer is injected here by plugin -->
  <div id="footer"></div>
</body>

</html>
```

## 3. Register the Route in `src/index.ts`

After creating the HTML file, add it to the server routes:

1. Import the post at the top of the file:
```typescript
import blog_post_YYYY_MM_DD_slug from "./posts/YYYY-MM-DD-post-slug.html";
```

2. Add the route in the `BLOG ROUTES` section:
```typescript
"/posts/YYYY-MM-DD-post-slug": blog_post_YYYY_MM_DD_slug,
```

## How Nav/Footer Injection Works

The Bun plugin (`src/plugins/playground.ts`) automatically injects the nav and footer HTML from:
- `src/shared/nav-bar.html`
- `src/shared/footer.html`

This happens at **bundle time**, so the HTML arrives fully rendered. No client-side fetching.

## Checklist

- [ ] File named with date prefix: `YYYY-MM-DD-slug.html`
- [ ] `og:title` meta tag with post title
- [ ] `og:description` meta tag with brief description
- [ ] `article:tag` meta tag (optional, for filtering)
- [ ] `<title>` tag: "Post Title - abyrd.me"
- [ ] `<div id="nav-bar"></div>` placeholder (plugin fills this)
- [ ] `<div id="footer"></div>` placeholder (plugin fills this)
- [ ] Theme toggle script: `<script type="module" src="../shared/theme-toggle.ts"></script>`
- [ ] Mobile back link in header (hidden on desktop with `sm:hidden`)
- [ ] `<time datetime="YYYY-MM-DD">` with formatted date text
- [ ] Import added to `src/index.ts`
- [ ] Route added to `src/index.ts` under BLOG ROUTES
