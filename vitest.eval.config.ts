import { existsSync } from "node:fs";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config";

// The eval calls the real OpenAI API, so it needs the same OPENAI_API_KEY and
// OPENAI_MODEL the app reads. Next.js loads .env files on its own; Vitest
// does not, so load them here. Variables already set in the shell win.
for (const file of [".env.development.local", ".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["evals/**/*.eval.ts"],
      // Each case waits on up to four model calls, the slowest with high
      // reasoning effort. Four at a time keeps clear of rate limits.
      testTimeout: 180_000,
      maxConcurrency: 4,
    },
  }),
);
