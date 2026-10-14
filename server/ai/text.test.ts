import { describe, expect, it } from "vitest";

import { buildSearchIndex, containsExcerpt, countWords, extractSection, normalizeForMatch } from "./text";

describe("busca de trechos no texto original", () => {
  const source = "Introdução.\n\nA Célula é a unidade   básica da vida.\nEla possui membrana, citoplasma e núcleo. Fim.";
  const index = buildSearchIndex(source);

  it("normaliza acentos, caixa, pontuação e espaços", () => {
    expect(normalizeForMatch("Célula,  É  vida!")).toBe("celula e vida");
  });

  it("encontra trechos com diferenças de formatação", () => {
    expect(containsExcerpt(index, "a celula e a unidade basica da vida")).toBe(true);
    expect(containsExcerpt(index, "a celula e a unidade basica do universo")).toBe(false);
  });

  it("exige um mínimo de palavras", () => {
    expect(containsExcerpt(index, "célula")).toBe(false);
  });

  it("recorta a seção original entre os marcadores", () => {
    const section = extractSection(source, index, "A célula é a unidade", "citoplasma e núcleo");
    expect(section).toBe("A Célula é a unidade   básica da vida.\nEla possui membrana, citoplasma e núcleo");
  });

  it("retorna null quando o marcador não existe", () => {
    expect(extractSection(source, index, "texto inexistente aqui", "citoplasma e núcleo")).toBeNull();
  });

  it("conta palavras", () => {
    expect(countWords("Uma frase,   com cinco palavras!")).toBe(5);
    expect(countWords("   ")).toBe(0);
  });
});
