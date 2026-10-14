# Semear

Plataforma de estudos fechada: o usuário envia aulas (PDF/TXT) e a IA do provedor que ele conectou
gera resumo, palavras-chave e questões. Next.js 15 + Prisma/PostgreSQL.

## Rodar localmente

Requisitos: Node 22 e PostgreSQL.

```bash
npm install
cp .env.example .env    # preencha DATABASE_URL e CREDENTIALS_ENCRYPTION_KEY
npm run db:migrate
npm run admin:create -- --email voce@exemplo.com --name "Seu Nome"
npm run dev
```

O `admin:create` mostra um código de uso único. Use-o em `/first-access` para definir a senha.

Gerar a `CREDENTIALS_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Ela precisa ser sempre a mesma: se mudar, as chaves de IA salvas deixam de abrir.

## Deploy (Vercel)

1. Crie um PostgreSQL gerenciado (Neon, Supabase ou o Postgres do marketplace da Vercel).
2. Em *Environment Variables* do projeto, defina:
   - `DATABASE_URL`: URL com pooling;
   - `DIRECT_URL`: URL direta, usada pelas migrações;
   - `CREDENTIALS_ENCRYPTION_KEY`: a mesma chave sempre.
3. Faça o deploy. O `vercel.json` aplica as migrações antes de cada build.
4. Crie o primeiro administrador uma única vez, apontando para o banco de produção:
   `DATABASE_URL=<url direta> npm run admin:create -- --email … --name "…"`.

Use um banco separado para os *preview deployments*, já que eles também aplicam as migrações.

Limites: arquivos de até 4 MB (limite de requisição da Vercel); o processamento de uma aula pode
levar até 300 s (`maxDuration`), então confirme o tempo máximo de função do seu plano.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` / `npm run typecheck` | Verificações estáticas |
| `npm test` | Testes de unidade e de API (usam o banco `<nome>_test`, que precisa existir) |
| `npm run build && npm run test:e2e` | Testes no navegador (Playwright) |
| `npm run db:migrate:dev` | Cria uma nova migração a partir do `schema.prisma` |
| `npm run db:seed` | Dados de demonstração (não apaga nada) |
| `npm run admin:create -- --email … --reissue` | Gera novo código para um admin que perdeu a senha |

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build a cada push.

## Estrutura

```
app/(public)    página inicial, login, primeiro acesso
app/(private)   área logada (o layout valida a sessão)
app/api         rotas da API (todas passam por server/http/api.ts)
components/     interface; components/ui tem os componentes base
lib/            código do navegador; lib/utils é compartilhado com o servidor
server/db       regras de negócio sobre o Prisma, sempre filtradas pelo usuário
server/ai       provedores (Anthropic, OpenAI, Gemini) e classificação das aulas
server/http     sessão, cookies e extração de texto
prisma/         schema, migrações e seed
```

`components/` e `lib/` não podem importar `server/` (regra do ESLint).
