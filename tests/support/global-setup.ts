import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveTestDatabaseUrl } from "./env";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Aplica as migrações versionadas ao banco de TESTE (operação não destrutiva).
 * O banco precisa existir; os testes limpam as próprias tabelas entre os casos.
 */
export default function setup() {
  const databaseUrl = resolveTestDatabaseUrl();
  try {
    execSync("npx prisma migrate deploy", {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
      stdio: "pipe",
    });
  } catch (error) {
    const output = error instanceof Error && "stdout" in error ? String((error as { stdout: unknown }).stdout) : "";
    throw new Error(`Falha ao aplicar migrações no banco de teste. Ele existe?\n${output}`);
  }
}
