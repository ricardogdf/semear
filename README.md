# Semear

Plataforma de estudos fechada: o usuário envia aulas (PDF/TXT) e a IA do provedor que ele conectou
gera resumo, palavras-chave e questões. Next.js 15 + Prisma/PostgreSQL.

As aulas ficam em matérias e, se o usuário quiser, em módulos dentro delas (ex.: Multiplicação e
Divisão em Matemática). Os simulados podem ser da matéria completa ou de um módulo, e o desempenho por
módulo (calculado a partir das questões respondidas em qualquer simulado) aponta o módulo mais fraco.

## Comunidade

Além da área de estudo, cada usuário tem um **perfil acadêmico público** (`/profile/<id>`: nome de
exibição, foto por URL https, biografia, instituição e curso), pode **pesquisar usuários** (`/people`),
**seguir** pessoas (`/following`), **publicar matérias** na **biblioteca pública** (`/library`),
**importar** matérias publicadas por outros, cadastrar **artigos, TCCs e outras publicações** (só para
ver, curtir e compartilhar) e consultar os rankings de **Conheça** (`/discover`).

Regras principais (todas validadas no servidor; as marcadas com * também no banco):

- Perfis, matérias públicas e publicações públicas abrem sem login, pelo link. Pesquisa, biblioteca,
  "Seguindo" e "Conheça" exigem login. Conteúdo privado responde 404 para quem não é o dono. E-mail,
  papel e dados da conta nunca aparecem nas páginas públicas. Contas desativadas somem da comunidade.
- Quem tem nome de exibição só é encontrado na pesquisa por ele (não pelo nome da conta).
- Seguir: uma relação por par* (chave composta) e ninguém segue a si mesmo* (`CHECK`).
- Curtir: uma curtida por usuário por publicação* (chave composta).
- Importar: só matérias. A rota de importação procura o id apenas entre matérias originais públicas;
  publicações não têm rota nem botão de importação. Uma importação ativa por usuário por original*
  (índice único `Subject(userId, importedFromId)`), inclusive com requisições simultâneas.
- Cópias importadas são sempre privadas* (`CHECK NOT isImported OR visibility = 'PRIVATE'`): a rota de
  visibilidade recusa (403) e o `PATCH` da matéria não aceita visibilidade nem origem.
- Contadores (importações, curtidas, seguidores) são **derivados das linhas existentes** (`COUNT` no
  banco), sem contador armazenado: não há como divergir. Excluir uma cópia decrementa uma única vez.
- Rankings usam só itens com contagem maior que zero, com desempate determinístico (matérias: publicação
  mais recente, depois id; publicações: cadastro mais recente, depois id; perfis: cadastro mais antigo,
  depois id) e paginação de 12 itens.

**Estratégia de importação.** A cópia é independente: matéria, módulos e aulas (texto extraído, resumos e
questões) são copiados em uma transação, e a cópia guarda a referência ao original e um retrato da
autoria (título e nome do autor). O Semear não armazena arquivos, só o texto extraído, então não há
arquivo grande duplicado; copiar as linhas é o que permite à cópia funcionar com os recursos existentes
(simulados, módulos, reprocessamento com a IA de quem importou) sem dar acesso ao original. Durante a
cópia o original fica travado (`FOR SHARE`): se o dono o tornar privado ou excluí-lo ao mesmo tempo, uma
matéria que deixou de ser pública nunca é copiada.

**Política para mudanças no original.** Editar o original não altera as cópias já feitas. Tornar o
original privado o tira da biblioteca, do perfil e dos rankings e impede novas importações; as cópias
existentes continuam, mas sem link para o original. Excluir o original mantém as cópias, com a autoria
preservada. Compartilhar uma cópia sempre aponta para o original público, quando ele existe.

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
   - `APP_URL` (opcional): URL pública, usada nos links dos metadados de compartilhamento. Sem ela,
     a Vercel usa o domínio de produção do projeto.
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
app/(community) páginas compartilháveis (perfil, matéria e publicação públicas), com ou sem login
app/api         rotas da API (todas passam por server/http/api.ts)
components/     interface; components/ui tem os componentes base
lib/            código do navegador; lib/utils é compartilhado com o servidor
server/db       regras de negócio sobre o Prisma, sempre filtradas pelo usuário
server/ai       provedores (Anthropic, OpenAI, Gemini) e classificação das aulas
server/http     sessão, cookies e extração de texto
prisma/         schema, migrações e seed
```

`components/` e `lib/` não podem importar `server/` (regra do ESLint).
