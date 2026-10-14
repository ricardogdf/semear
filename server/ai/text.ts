/**
 * Utilitários para localizar trechos citados pelo modelo dentro do texto original,
 * tolerando diferenças de acentuação, caixa, pontuação e quebras de linha.
 */

const DIACRITICS = /[̀-ͯ]/g;
const ALPHANUMERIC = /[\p{L}\p{N}]/u;

interface SearchIndex {
  /** Texto normalizado: minúsculas, sem acentos, só letras/números separados por um espaço. */
  normalized: string;
  /** Para cada caractere de `normalized`, o índice correspondente no texto original. */
  originalIndex: number[];
}

export function normalizeForMatch(text: string) {
  return buildSearchIndex(text).normalized;
}

export function buildSearchIndex(source: string): SearchIndex {
  let normalized = "";
  const originalIndex: number[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const folded = source[index]!.normalize("NFKD").replace(DIACRITICS, "").toLowerCase();
    for (const char of folded) {
      if (ALPHANUMERIC.test(char)) {
        normalized += char;
        originalIndex.push(index);
      } else if (normalized.length > 0 && !normalized.endsWith(" ")) {
        normalized += " ";
        originalIndex.push(index);
      }
    }
  }

  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    originalIndex.pop();
  }

  return { normalized, originalIndex };
}

export function countWords(text: string) {
  const normalized = normalizeForMatch(text);
  return normalized ? normalized.split(" ").length : 0;
}

/** Verdadeiro se o trecho (com pelo menos `minWords` palavras) aparece literalmente no texto. */
export function containsExcerpt(index: SearchIndex, excerpt: string, minWords = 4) {
  const needle = normalizeForMatch(excerpt);
  if (!needle || needle.split(" ").length < minWords) {
    return false;
  }
  return index.normalized.includes(needle);
}

/**
 * Recorta do texto original a seção que começa em `startQuote` e termina em `endQuote`.
 * Retorna null se algum dos marcadores não for encontrado (o modelo não citou literalmente).
 */
export function extractSection(source: string, index: SearchIndex, startQuote: string, endQuote: string) {
  const start = normalizeForMatch(startQuote);
  const end = normalizeForMatch(endQuote);
  if (!start || !end || start.split(" ").length < 3 || end.split(" ").length < 3) {
    return null;
  }

  const startPos = index.normalized.indexOf(start);
  if (startPos === -1) return null;

  const endPos = index.normalized.indexOf(end, startPos);
  if (endPos === -1) return null;

  const originalStart = index.originalIndex[startPos]!;
  const originalEnd = index.originalIndex[endPos + end.length - 1]! + 1;
  const section = source.slice(originalStart, originalEnd).trim();
  return section || null;
}

export function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, maxChars), truncated: true };
}
