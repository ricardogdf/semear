import { expect, test } from "@playwright/test";

import { loginAs, PASSWORD } from "./helpers";

test.describe("páginas compartilháveis sem login", () => {
  test("perfil público mostra dados acadêmicos e conteúdos públicos, sem e-mail", async ({ page }) => {
    await page.goto("/profile/e2e-diana");
    await expect(page.getByRole("heading", { level: 1, name: "Diana Pesquisadora" })).toBeVisible();
    await expect(page.getByText("Ciências Biológicas").first()).toBeVisible();
    await expect(page.getByText("Pesquisa genética de plantas.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Genética Básica" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Herança mendeliana em ervilhas" })).toBeVisible();
    await expect(page.getByText("Rascunho privado de TCC")).toHaveCount(0);
    await expect(page.getByText("Anotações privadas da Diana")).toHaveCount(0);
    await expect(page.getByText("diana@e2e.test")).toHaveCount(0);
    await expect(page.getByTestId("follower-count")).toContainText("1 seguidor");
  });

  test("após entrar para seguir, volta ao perfil de origem", async ({ page }) => {
    await page.goto("/profile/e2e-diana");
    await page.getByRole("link", { name: "Entrar para seguir" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile%2Fe2e-diana/);
    await page.getByLabel("E-mail").fill("user@e2e.test");
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/profile/e2e-diana");
    await expect(page.getByRole("button", { name: "Seguir Diana Pesquisadora" })).toBeVisible();
    // No perfil de outra pessoa, "Meu perfil" não fica marcado como página atual.
    const myProfile = page.getByRole("complementary").getByRole("link", { name: "Meu perfil" });
    await expect(myProfile).not.toHaveAttribute("aria-current", "page");
    await myProfile.click();
    await expect(page.getByRole("heading", { level: 1, name: "Bruno Estudante" })).toBeVisible();
    await expect(myProfile).toHaveAttribute("aria-current", "page");
  });

  test("conteúdo privado não abre pela URL, nem com login de outra pessoa", async ({ page }) => {
    for (const path of ["/library/e2e-materia-privada", "/publications/e2e-artigo-privado", "/profile/nao-existe"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    }
    await loginAs(page, "user@e2e.test");
    await page.goto("/library/e2e-materia-privada");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await expect(page.getByText("Anotações privadas da Diana")).toHaveCount(0);
  });

  test("áreas de descoberta exigem login e preservam o destino", async ({ page }) => {
    await page.goto("/discover");
    await expect(page).toHaveURL(/\/login\?next=%2Fdiscover/);
    await page.goto("/library");
    await expect(page).toHaveURL(/\/login\?next=%2Flibrary/);
  });
});

test.describe("seguir usuários", () => {
  test("pesquisa, segue, aparece em Seguindo e deixa de seguir", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Pesquisar usuários" }).first().click();
    await page.waitForURL("**/people");

    await page.getByLabel("Nome").fill("diana");
    await page.getByLabel("Curso").fill("biológicas");
    await page.getByRole("button", { name: "Pesquisar" }).click();
    const card = page.getByRole("article").filter({ hasText: "Diana Pesquisadora" });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: "Seguir Diana Pesquisadora" }).click();
    await expect(card.getByRole("button", { name: "Deixar de seguir Diana Pesquisadora" })).toBeVisible();
    await expect(card.getByText("2 seguidores")).toBeVisible();

    await page.goto("/following");
    const followed = page.getByRole("article").filter({ hasText: "Diana Pesquisadora" });
    await expect(followed).toBeVisible();
    await followed.getByRole("button", { name: "Deixar de seguir Diana Pesquisadora" }).click();
    await expect(followed.getByRole("button", { name: "Seguir Diana Pesquisadora" })).toBeVisible();
    await expect(followed.getByText("1 seguidor")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Você ainda não segue ninguém")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pesquisar usuários" }).last()).toBeVisible();
  });

  test("o próprio perfil não tem botão de seguir", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Bruno Estudante" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Seguir/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Editar perfil" })).toBeVisible();
  });
});

test.describe("biblioteca pública e importação", () => {
  test("importa uma matéria pública; a cópia é privada, identifica a autoria e não pode ser publicada", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await page.goto("/library");
    await page.getByRole("link", { name: "Genética Básica" }).click();
    await page.waitForURL("**/library/e2e-genetica");
    await expect(page.getByText("Ainda não importada")).toBeVisible();
    await expect(page.getByText("Primeira lei de Mendel")).toBeVisible();

    await page.getByRole("button", { name: "Importar" }).click();
    await expect(page.getByText("Matéria importada para a sua biblioteca.")).toBeVisible();
    await expect(page.getByText("Importada 1 vez")).toBeVisible();
    await page.getByRole("link", { name: "Já importada · abrir" }).click();
    await page.waitForURL(/\/subjects\/(?!e2e-genetica)/);

    await expect(page.getByRole("heading", { name: "Matéria importada" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Diana Pesquisadora" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar na biblioteca" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copiar link do original" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Primeira lei de Mendel/ })).toBeVisible();

    // Mesmo pela API, publicar a cópia é recusado.
    const copyId = page.url().split("/subjects/")[1]!;
    const status = await page.evaluate(
      async (id) =>
        (
          await fetch(`/api/subjects/${id}/visibility`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility: "PUBLIC" }),
          })
        ).status,
      copyId,
    );
    expect(status).toBe(403);

    await page.goto("/subjects");
    await expect(page.getByText("Importada").first()).toBeVisible();

    // A matéria entra no ranking de mais importadas.
    await page.goto("/discover");
    const ranked = page.getByRole("article").filter({ hasText: "Genética Básica" });
    await expect(ranked.getByText("Importada 1 vez")).toBeVisible();
    await expect(ranked.getByRole("link", { name: "Já importada · abrir" })).toBeVisible();
  });

  test("a dona publica e torna privada a própria matéria", async ({ page }) => {
    await loginAs(page, "diana@e2e.test");
    await page.goto("/subjects");
    await page.getByRole("link", { name: "Anotações privadas da Diana" }).first().click();
    await expect(page.getByRole("heading", { name: "Compartilhamento" })).toBeVisible();

    // Sem aulas, o servidor recusa a publicação e a tela mostra o motivo.
    await page.getByRole("button", { name: "Publicar na biblioteca" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("dialog").getByText("Envie ao menos uma aula antes de publicar a matéria.")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/subjects/e2e-genetica");
    await page.getByRole("button", { name: "Tornar privada" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Tornar privada" }).click();
    await expect(page.getByText("Matéria agora é privada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar na biblioteca" })).toBeVisible();

    await page.getByRole("button", { name: "Publicar na biblioteca" }).click();
    await page.getByRole("dialog").getByLabel("Descrição (opcional)").fill("Leis de Mendel, revisadas.");
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Matéria publicada na biblioteca.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver página pública" })).toBeVisible();
  });
});

test.describe("publicações acadêmicas", () => {
  test("curte, remove a curtida e compartilha links interno e externo, sem opção de importar", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await loginAs(page, "user@e2e.test");
    await page.goto("/publications/e2e-artigo");
    await expect(page.getByRole("heading", { level: 1, name: "Herança mendeliana em ervilhas" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Importar/ })).toHaveCount(0);

    const like = page.getByRole("button", { name: "Curtir “Herança mendeliana em ervilhas”" });
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("1 curtida")).toBeVisible();

    await page.getByRole("button", { name: "Copiar link", exact: true }).click();
    await expect(page.getByRole("button", { name: "Link copiado!" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/publications/e2e-artigo`);

    await page.getByRole("button", { name: "Copiar link original" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://repositorio.exemplo.edu/handle/123");
    await expect(page.getByRole("link", { name: /Abrir no site original/ })).toHaveAttribute("rel", /noopener/);

    await page.goto("/discover");
    await page.getByRole("tab", { name: "Artigos mais curtidos" }).click();
    const ranked = page.getByRole("article").filter({ hasText: "Herança mendeliana em ervilhas" });
    await expect(ranked.getByText("1 curtida")).toBeVisible();
    await expect(ranked.getByRole("button", { name: /Importar/ })).toHaveCount(0);

    await page.goto("/publications/e2e-artigo");
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("0 curtidas")).toBeVisible();
  });

  test("edita o perfil e cadastra uma publicação", async ({ page }) => {
    await loginAs(page, "user@e2e.test");
    await page.goto("/settings/profile");
    await page.getByLabel("Universidade ou instituição").fill("USP");
    await page.getByLabel("Curso").fill("Medicina");
    await page.getByLabel("Biografia").fill("Interesse em genética médica.");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByText("Perfil atualizado.")).toBeVisible();

    await page.getByRole("button", { name: "Nova publicação" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tipo").selectOption({ label: "TCC" });
    await dialog.getByLabel("Título").fill("Doenças hereditárias na atenção básica");
    await dialog.getByLabel("Autor(es)").fill("Bruno Estudante");
    await dialog.getByRole("button", { name: "Cadastrar publicação" }).click();
    await expect(page.getByText("Publicação cadastrada.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Doenças hereditárias na atenção básica" })).toBeVisible();

    await page.getByRole("link", { name: "Ver perfil público" }).click();
    await expect(page.getByText("Interesse em genética médica.")).toBeVisible();
    await expect(page.getByText("USP").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Doenças hereditárias na atenção básica" })).toBeVisible();
  });

  test("ranking de perfis mostra quem tem seguidores", async ({ page }) => {
    await loginAs(page, "admin@e2e.test");
    await page.goto("/discover");
    await page.getByRole("tab", { name: "Perfis mais seguidos" }).click();
    const ranked = page.getByRole("article").filter({ hasText: "Diana Pesquisadora" });
    await expect(ranked.getByText("1 seguidor")).toBeVisible();
    await expect(ranked.getByRole("button", { name: "Deixar de seguir Diana Pesquisadora" })).toBeVisible();
  });
});
