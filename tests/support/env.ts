import { loadEnvFile } from "../../lib/load-env";

/**
 * Resolve a URL do banco de testes. Usa TEST_DATABASE_URL ou, na falta dela, o mesmo servidor
 * de DATABASE_URL com o banco "<nome>_test". Recusa qualquer banco cujo nome não termine em _test,
 * para que os testes (que limpam tabelas) nunca toquem o banco de desenvolvimento.
 */
export function resolveTestDatabaseUrl() {
  loadEnvFile();

  const explicit = process.env.TEST_DATABASE_URL;
  const base = explicit ?? process.env.DATABASE_URL;
  if (!base) {
    throw new Error("Defina TEST_DATABASE_URL (ou DATABASE_URL) para rodar os testes.");
  }

  const url = new URL(base);
  if (!explicit) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Banco de teste recusado: "${databaseName}" não termina em _test.`);
  }

  return url.toString();
}
