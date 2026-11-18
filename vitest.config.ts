import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Los *.spec.ts de e2e pertenecen a Playwright, no a Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
