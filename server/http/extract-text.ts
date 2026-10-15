import { DomainError } from "@/server/db";

// A Vercel limita o corpo das requisições a 4,5 MB; 4 MB deixa margem para o restante do formulário.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const PDF_MAGIC = "%PDF-";
const PAGE_MARKER = /^-- \d+ of \d+ --$/gm;

type UploadSource = "TXT" | "PDF";

function detectSource(fileName: string): UploadSource | null {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "pdf") return "PDF";
  if (extension === "txt") return "TXT";
  return null;
}

async function extractPdf(bytes: Uint8Array) {
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== PDF_MAGIC) {
    throw new DomainError("VALIDATION", "O arquivo não é um PDF válido.");
  }

  // Carregado só para PDFs: o pdfjs exige DOMMatrix já na importação, e o worker do pdf-parse
  // define esses globais via @napi-rs/canvas (importado estaticamente, então entra no bundle da Vercel).
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: bytes, CanvasFactory });
  try {
    const result = await parser.getText();
    return result.text.replace(PAGE_MARKER, "").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    throw new DomainError(
      "VALIDATION",
      "Não foi possível ler o PDF (arquivo corrompido, protegido por senha ou em formato não suportado).",
    );
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

function extractTxt(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
  } catch {
    // Arquivos .txt antigos costumam estar em Windows-1252/Latin-1.
    return new TextDecoder("windows-1252").decode(bytes).trim();
  }
}

/**
 * Extrai o texto de um arquivo enviado. Nunca devolve texto substituto: se não houver texto
 * extraível, lança erro de validação (o arquivo não é salvo).
 */
export async function extractUploadedText(file: File) {
  const source = detectSource(file.name);
  if (!source) {
    throw new DomainError("VALIDATION", "Formato inválido. Envie arquivos .txt ou .pdf.");
  }
  if (file.size === 0) {
    throw new DomainError("VALIDATION", "O arquivo está vazio.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new DomainError("VALIDATION", "Arquivo maior que 4 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = source === "PDF" ? await extractPdf(bytes) : extractTxt(bytes);

  if (!text) {
    throw new DomainError(
      "VALIDATION",
      source === "PDF"
        ? "O PDF não contém texto extraível (pode ser um documento digitalizado como imagem)."
        : "O arquivo não contém texto.",
    );
  }

  return { source, text };
}
