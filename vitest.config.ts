import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Los tests de reglas comparten un único emulador: sin paralelismo.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
