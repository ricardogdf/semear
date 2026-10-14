/**
 * Inicializa o primeiro administrador. Executado explicitamente no servidor:
 *
 *   npm run admin:create -- --email admin@exemplo.com --name "Nome Completo"
 *
 * - Se não houver administrador ativo: cria a conta (ou promove um usuário existente com o
 *   mesmo e-mail) e imprime um código de primeiro acesso de uso único, válido por 72 horas.
 * - Se já houver administrador ativo: recusa. Usuários seguintes são criados pela área administrativa.
 * - Recuperação: `--reissue` gera um novo código para um administrador ativo existente.
 *
 * Nenhuma senha é definida aqui: o administrador define a própria senha em /first-access.
 * O código é exibido apenas neste terminal e nunca é gravado em texto puro.
 */
import { parseArgs } from "node:util";

import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

import { prisma } from "../server/db/client";
import { isDomainError } from "../server/db/errors";
import { bootstrapAdmin } from "../server/db/users";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      reissue: { type: "boolean", default: false },
    },
  });

  if (!values.email) {
    console.error('Uso: npm run admin:create -- --email admin@exemplo.com --name "Nome Completo" [--reissue]');
    process.exitCode = 1;
    return;
  }

  const result = await bootstrapAdmin({ email: values.email, name: values.name, reissue: values.reissue });
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  console.log("");
  console.log(
    result.created
      ? "Administrador criado."
      : result.promoted
        ? "Usuário existente promovido a administrador."
        : "Novo código de acesso gerado para o administrador.",
  );
  console.log("");
  console.log(`  E-mail:  ${values.email.trim().toLowerCase()}`);
  console.log(`  Código:  ${result.code}`);
  console.log(`  Validade: ${result.expiresAt.toLocaleString("pt-BR")}`);
  console.log("");
  console.log(`Acesse ${appUrl}/first-access, informe o e-mail e o código e defina a senha.`);
  console.log("O código é de uso único e não será exibido novamente.");
}

main()
  .catch((error) => {
    if (isDomainError(error)) {
      console.error(`Não foi possível concluir: ${error.message}`);
    } else {
      console.error("Erro inesperado:", error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
