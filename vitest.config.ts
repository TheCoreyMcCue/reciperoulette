import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    env: {
      SESSION_SECRET: "test-secret-test-secret-test-secret-123456",
      DYNAMO_REGION: "eu-central-1",
      DYNAMO_TABLE_NAME: "reciperoulette-test",
    },
  },
});
