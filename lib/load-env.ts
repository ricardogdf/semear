/**
 * Carrega o .env da raiz em scripts e testes executados fora do Next.js (que já o carrega sozinho).
 * Variáveis já definidas no ambiente têm precedência; a ausência do arquivo não é erro.
 */
export function loadEnvFile(path = ".env") {
  try {
    process.loadEnvFile(path);
  } catch {
    // Sem .env: usa apenas as variáveis do ambiente.
  }
}
