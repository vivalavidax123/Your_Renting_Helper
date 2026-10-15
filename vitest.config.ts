import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Tests import application code via the "@/..." path alias (e.g.
// "@/app/lib/auth"), the same alias tsconfig.json defines for the app. Vitest
// does not read tsconfig paths on its own, so map "@" to the project root here
// or those imports fail to resolve.
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": projectRoot,
      // Server modules start with `import "server-only"`, which throws unless
      // the bundler marks the code as server code. Tests run in plain Node, so
      // they get the package's empty server build instead.
      "server-only": `${projectRoot}/node_modules/server-only/empty.js`,
    },
  },
});
