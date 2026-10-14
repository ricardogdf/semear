import { randomBytes } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

import { resolveTestDatabaseUrl } from "./tests/support/env";

/**
 * Testes de ponta a ponta em navegador real contra o build de produção (`next start`),
 * usando o banco de TESTE (nome terminado em _test). Pré-requisito: `npm run build`.
 */
const PORT = 3100;
const databaseUrl = resolveTestDatabaseUrl();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results/e2e",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "pt-BR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      CREDENTIALS_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    },
  },
});
