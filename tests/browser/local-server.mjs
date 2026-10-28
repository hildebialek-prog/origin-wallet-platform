import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import { API_BASE, API_PREFIX, HEALTH_PATH, TEST_PORT } from "./test-origin.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  envFile: false,
  envPrefix: [],
  mode: "va-browser",
  cacheDir: "node_modules/.vite-va-browser",
  define: {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(API_BASE),
    "import.meta.env.VITE_AUTH_ME_PATH": JSON.stringify("/auth/me"),
    "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(""),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    react(),
    {
      name: "va-browser-isolation",
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const pathname = (request.url ?? "").split("?")[0];
          if (pathname === HEALTH_PATH) {
            response.setHeader("Content-Type", "text/plain");
            response.end("VA_BROWSER_TEST_SERVER_ONLY");
          } else if (pathname.startsWith(API_PREFIX) || pathname.startsWith("/api/")) {
            // Mock APIs must be fulfilled in the browser. There is no backend/proxy.
            response.statusCode = 503;
            response.end("Unintercepted test API request");
          } else next();
        });
      },
      // Remove only external presentation resources from the test HTML. Production
      // index.html and all application auth/lifecycle modules run unchanged.
      transformIndexHtml(html) {
        return html
          .replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>/gi, "")
          .replace(/<script\b[^>]*src=["']https?:\/\/[^>]*>[\s\S]*?<\/script>/gi, "");
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: TEST_PORT,
    strictPort: true,
    hmr: false,
    headers: {
      "Content-Security-Policy": `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:${TEST_PORT}; object-src 'none'; base-uri 'self'`,
    },
  },
});

await server.listen();
const stop = async () => { await server.close(); process.exit(0); };
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
