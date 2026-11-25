import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// Operator-only AUTH-05.1 selection: no dotenv files or accepted baseline suite.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    env: { VITE_API_BASE_URL: "https://api.auth.example.test/api" },
    include: ["src/test/customerCsp.test.ts", "src/test/customerTranslationIsolation.test.tsx"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
