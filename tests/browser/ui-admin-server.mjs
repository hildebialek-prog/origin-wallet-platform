// Isolated Admin UI test server: no .env, backend, proxy, or live API access.
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react-swc";
const root = fileURLToPath(new URL("../../../admin_origin_wallet/", import.meta.url));
process.chdir(root);
const server = await createServer({
  root, configFile: false, envFile: false, envPrefix: [], mode: "ui-browser",
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://127.0.0.1:4181/__ui_mock_api") },
  resolve: { alias: { "@": `${root}src` } },
  plugins: [react(), {
    name: "ui-browser-isolation",
    configureServer(vite) {
      vite.middlewares.use((request, response, next) => {
        if ((request.url || "").startsWith("/__ui_mock_api") || (request.url || "").startsWith("/api/")) {
          response.statusCode = 503;
          response.end("Unintercepted test API request");
        } else next();
      });
    },
    transformIndexHtml(html) {
      return html.replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>/gi, "").replace(/<script\b[^>]*src=["']https?:\/\/[^>]*>[\s\S]*?<\/script>/gi, "");
    },
  }],
  server: { host: "127.0.0.1", port: 4181, strictPort: true, hmr: false },
});
await server.listen();
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, async () => { await server.close(); process.exit(0); });
