import { randomBytes } from "node:crypto";

import { resolveTestDatabaseUrl } from "./env";

process.env.DATABASE_URL = resolveTestDatabaseUrl();
// Chave efêmera, só para os testes (nunca a de produção).
process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
