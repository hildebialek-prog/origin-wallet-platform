import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { customerCspPlugin } from "./security/customerCsp";

export default defineConfig(({ mode, command }) => ({
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
  },
  esbuild: mode === "production" ? { drop: ["console"], legalComments: "none" } : undefined,
  // Vite dev/HMR is local tooling, not the production security boundary.
  // Every published build (including build:dev) must produce enforcing headers.
  plugins: [react(), ...(command === "build" ? [customerCspPlugin(loadEnv(mode, process.cwd(), "VITE_"))] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
