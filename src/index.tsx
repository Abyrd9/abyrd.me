import { serve } from "bun";
import "@fontsource-variable/dm-sans";
import fourOhFour from "./404.html";
import index from "./index.html";
import { getLinkPreview } from "./routes/get-link-preview";
import { getLogoImage } from "./routes/get-logo-image";
import { getPostsList } from "./routes/get-posts-list";
import { robots } from "./routes/robots";
import { sitemap } from "./routes/sitemap";

const server = serve({
  port: process.env.PORT || 3000,
  routes: {
    // ------------------------------------------------------------
    // BLOG ROUTES
    // ------------------------------------------------------------

    // ------------------------------------------------------------
    // OTHER ROUTES
    // ------------------------------------------------------------
    "/api/posts": {
      async GET(req) {
        return getPostsList(req);
      },
    },
    "/api/images/logos/:logo": {
      async GET(req) {
        return getLogoImage(req);
      },
    },
    "/api/link-preview": {
      async GET(req) {
        return getLinkPreview(req);
      },
    },
    "/robots.txt": {
      async GET(req) {
        return robots(req);
      },
    },
    "/sitemap.xml": {
      async GET(req) {
        return sitemap(req);
      },
    },

    // ------------------------------------------------------------
    // CATCH ALL AND INDEX ROUTES
    // ------------------------------------------------------------
    "/": index,
    "/*": fourOhFour,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
