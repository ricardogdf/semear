import { NextResponse } from "next/server";

import { createAndProcessContent, DomainError } from "@/server/db";
import { aiSelectionSchema, uploadContentSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";
import { extractUploadedText } from "@/server/http/extract-text";

// O processamento por IA acontece dentro da requisição e pode levar alguns minutos.
export const maxDuration = 300;

function optionalField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const POST = authRoute("user", async ({ request, user }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new DomainError("VALIDATION", "Envio inválido.");
  }

  const { subjectId, module: moduleRef } = uploadContentSchema.parse({
    subjectId: formData.get("subjectId"),
    module: optionalField(formData, "module"),
  });
  const selection = aiSelectionSchema.parse({
    provider: optionalField(formData, "provider"),
    model: optionalField(formData, "model"),
  });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new DomainError("VALIDATION", "Envie um arquivo .txt ou .pdf.");
  }

  const { source, text } = await extractUploadedText(file);
  const content = await createAndProcessContent(user.id, {
    subjectRef: subjectId,
    moduleRef,
    body: text,
    originalFileName: file.name.slice(0, 200),
    source,
    ...selection,
  });

  return NextResponse.json(content, { status: 201 });
});
