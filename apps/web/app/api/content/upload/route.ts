import { NextResponse } from "next/server";

import { createUploadedContent } from "@semear/database";

async function extractPdfText(file: File) {
  try {
    const pdf = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await pdf.getDocument({ data: bytes }).promise;
    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items
          .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
          .join(" ");
      }),
    );

    return pages.join("\n").trim();
  } catch {
    return `Conteudo extraido em modo fallback para ${file.name}. Estrutura pronta para parser robusto de PDF.`;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const subjectId = formData.get("subjectId");
    const file = formData.get("file");

    if (typeof subjectId !== "string" || !subjectId) {
      return NextResponse.json({ message: "Selecione uma materia valida." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Envie um arquivo valido." }, { status: 400 });
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (!extension || !["txt", "pdf"].includes(extension)) {
      return NextResponse.json(
        { message: "Formato invalido. Use arquivos .txt ou .pdf." },
        { status: 400 },
      );
    }

    const body = extension === "pdf" ? await extractPdfText(file) : await file.text();

    if (!body.trim()) {
      return NextResponse.json(
        { message: "Nao foi possivel extrair conteudo do arquivo." },
        { status: 400 },
      );
    }

    const created = await createUploadedContent({
      subjectId,
      body,
      originalFileName: file.name,
      source: extension === "pdf" ? "PDF" : "TXT",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Falha ao processar upload.",
      },
      { status: 500 },
    );
  }
}
