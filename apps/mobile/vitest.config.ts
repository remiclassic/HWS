import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx", "lib/**/*.test.ts"],
    setupFiles: ["./__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "lib/**/*.tsx"],
      exclude: ["**/*.test.*", "lib/registerForPush*.ts", "lib/sentry*.ts"],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
  resolve: {
    alias: {
      "react-native": "react-native-web",
    },
  },
});
