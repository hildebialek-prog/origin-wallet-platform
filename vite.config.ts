import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    hmr: {
      overlay: true,
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
    target: "es2020",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/react-router-dom/")) {
            return "react-vendor";
          }

          if (id.includes("/@radix-ui/") || id.includes("/lucide-react/") || id.includes("/cmdk/") || id.includes("/vaul/")) {
            return "ui-vendor";
          }

          if (id.includes("/@tanstack/")) {
            return "query-vendor";
          }

          if (id.includes("/recharts/") || id.includes("/framer-motion/") || id.includes("/date-fns/")) {
            return "feature-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  esbuild: mode === "production" ? { drop: ["console"], legalComments: "none" } : undefined,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
