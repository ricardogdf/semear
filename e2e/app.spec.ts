import { expect, test } from "@playwright/test";

import { loginAs, PASSWORD } from "./helpers";

test.describe("área pública", () => {
  test("apresenta o sistema, sem preços, com login e solicitação de acesso", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Transforme suas aulas");
    await expect(page.getByRole("banner").getByRole("link", { name: "Entrar" })).toBeVisible();
    await expect(page.getByText(/R\$|preço|plano|assinatura mensal/i)).toHaveCount(0);

    await page.getByLabel("Nome completo").fill("Eduarda Teste");
    await page.getByLabel("E-mail").fill("eduarda@e2e.test");
    await page.getByLabel(/Como pretende usar/).fill("Revisar aulas da faculdade.");
    await page.getByRole("button", { name: "Solicitar acesso" }).click();
    await expect(page.getByText("Solicitação recebida")).toBeVisible();
  });

  test("valida o formulário de solicitação no navegador", async ({ page }) => {
    await page.goto("/#solicitar-acesso");
    await page.getByRole("button", { name: "Solicitar acesso" }).click();
    await expect(page.getByText("Informe o nome completo.")).toBeVisible();
    await expect(page.getByText("Informe o e-mail.")).toBeVisible();
  });
});

test.describe("autenticação", () => {
  test("rota privada sem sessão redireciona para o login preservando o destino", async ({ page }) => {
    await page.goto("/subjects");
    await expect(page).toHaveURL(/\/login\?next=%2Fsubjects/);
  });

  test("credenciais inválidas mostram erro genérico", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("user@e2e.test");
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login, cookie HttpOnly e logout", async ({ page, context }) => {
    await loginAs(page, "user@e2e.test");
    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name.includes("semear_session"));
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("semear_session");

    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page.waitForURL("**/login");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("após o login, volta para a página pedida", async ({ page }) => {
    await page.goto("/simulations");
    await page.getByLabel("E-mail").fill("user@e2e.test");
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/simulations");
  });
});

test.describe("menu lateral", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("recolhe, mostra tooltip, mantém o item ativo e persiste a preferência", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    const nav = page.getByRole("complementary").getByRole("navigation", { name: "Navegação principal" });
    const toggle = page.getByRole("button", { name: "Recolher menu lateral" });

    await expect(nav.getByRole("link", { name: "Matérias" })).toBeVisible();
    await expect(nav.getByText("Matérias")).toBeVisible();
    await toggle.click();

    const expand = page.getByRole("button", { name: "Expandir menu lateral" });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    const subjectsLink = nav.getByRole("link", { name: "Matérias" });
    await expect(subjectsLink).toBeVisible();

    // Navegação por teclado (Tab): o foco visível exibe o nome (tooltip).
    await nav.getByRole("link", { name: "Dashboard" }).focus();
    await page.keyboard.press("Tab");
    await expect(subjectsLink).toBeFocused();
    await expect(subjectsLink.locator("span[aria-hidden]").last()).toHaveCSS("opacity", "1");
    await subjectsLink.press("Enter");
    await page.waitForURL("**/subjects");
    await expect(subjectsLink).toHaveAttribute("aria-current", "page");

    await page.reload();
    await expect(page.getByRole("button", { name: "Expandir menu lateral" })).toBeVisible();
    await page.getByRole("button", { name: "Expandir menu lateral" }).click();
    await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("menu em drawer abre, navega e fecha", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await expect(page.getByRole("complementary")).toBeHidden();

    await page.getByRole("button", { name: "Abrir menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Simulados" }).click();
    await page.waitForURL("**/simulations");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { name: "Simulados" })).toBeVisible();
  });
});

test.describe("autorização administrativa", () => {
  test("usuário comum não vê nem acessa a administração", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/dashboard/);
    const status = await page.evaluate(async () => (await fetch("/api/admin/users")).status);
    expect(status).toBe(403);
  });

  test("administrador cria usuário e recebe código de primeiro acesso", async ({ page }) => {
    await loginAs(page, "admin@e2e.test");
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
    await page.getByRole("button", { name: "Novo usuário" }).click();
    await page.getByLabel("Nome").fill("Fábio Novo");
    await page.getByLabel("E-mail").fill("fabio@e2e.test");
    await page.getByRole("button", { name: "Criar conta" }).click();

    const code = page.getByLabel("Código de acesso");
    await expect(code).toHaveText(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
    const value = (await code.textContent())!;
    await page.getByRole("button", { name: "Concluir" }).click();

    // O novo usuário define a própria senha com o código.
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page.waitForURL("**/login");
    await page.goto("/first-access");
    await page.getByLabel("E-mail da conta").fill("fabio@e2e.test");
    await page.getByLabel("Código de acesso").fill(value);
    await page.getByLabel("Nova senha", { exact: true }).fill("senha-do-fabio-1");
    await page.getByLabel("Confirme a nova senha").fill("senha-do-fabio-1");
    await page.getByRole("button", { name: "Definir senha e entrar" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Fábio Novo").first()).toBeVisible();
  });

  test("administrador aprova solicitação de acesso", async ({ page }) => {
    await loginAs(page, "admin@e2e.test");
    await page.goto("/admin/access-requests");
    const card = page.getByRole("listitem").filter({ hasText: "daniela@e2e.test" });
    await card.getByRole("button", { name: "Aprovar e criar conta" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByLabel("Código de acesso")).toBeVisible();
  });
});

test.describe("estudo e simulados", () => {
  test("mostra o status da classificação de cada aula", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await page.goto("/subjects");
    await page.getByRole("link", { name: "Ciências Ambientais" }).first().click();

    await expect(page.getByText("Conteúdo didático identificado").first()).toBeVisible();
    await expect(page.getByText("Aula introdutória: geração de questões não necessária").first()).toBeVisible();
    await expect(page.getByText("Erro no processamento: tente novamente").first()).toBeVisible();

    await page.getByRole("button", { name: /Apresentação da disciplina/ }).click();
    await expect(page.getByText("sem conteúdo da disciplina")).toBeVisible();
  });

  test("sem provedor conectado, o envio orienta a conectar", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await expect(page.getByText("Nenhum provedor de IA conectado")).toBeVisible();
    await expect(page.getByRole("button", { name: /Processar aula/ })).toBeDisabled();
    await page.getByRole("link", { name: "Provedores de IA" }).last().click();
    await expect(page.getByRole("heading", { name: "Anthropic Claude" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "OpenAI ChatGPT" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Google Gemini" })).toBeVisible();
  });

  test("gera simulado, responde e vê o resultado corrigido", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await page.goto("/simulations");
    await page.getByRole("button", { name: /Ciências Ambientais/ }).click();
    await page.getByRole("button", { name: "Gerar e iniciar" }).click();

    await expect(page.getByRole("timer")).toBeVisible();
    for (let index = 0; index < 3; index += 1) {
      await page.getByRole("radio").first().click();
      if (index < 2) await page.getByRole("button", { name: /Próxima/ }).click();
    }
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page.getByRole("heading", { name: "Simulado concluído" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Revisão" })).toBeVisible();
  });
});
