import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Los tests de reglas comparten un único emulador: sin paralelismo.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
