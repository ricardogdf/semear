import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { decryptSecret, EncryptionNotConfiguredError, encryptSecret, isEncryptionConfigured } from "./encryption";
import { getPasswordPolicyError, hashPassword, verifyPassword } from "./password";
import { generateSetupCode, hashSetupCode, normalizeSetupCode } from "./tokens";

describe("hash de senha (scrypt)", () => {
  it("verifica a senha correta e rejeita a incorreta", async () => {
    const hash = await hashPassword("minha-senha-123");
    expect(hash.startsWith("scrypt$131072$8$1$")).toBe(true);
    expect(hash).not.toContain("minha-senha-123");
    expect(await verifyPassword("minha-senha-123", hash)).toBe(true);
    expect(await verifyPassword("outra-senha-123", hash)).toBe(false);
  });

  it("usa salt aleatório (hashes diferentes para a mesma senha)", async () => {
    expect(await hashPassword("mesma-senha-1")).not.toBe(await hashPassword("mesma-senha-1"));
  });

  it("rejeita formatos desconhecidos", async () => {
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });

  it("aplica a política mínima", () => {
    expect(getPasswordPolicyError("curta1")).toMatch(/pelo menos 10/);
    expect(getPasswordPolicyError("somenteletras")).toMatch(/letras e números/);
    expect(getPasswordPolicyError("1234567890")).toMatch(/letras e números/);
    expect(getPasswordPolicyError("senha-valida-1")).toBeNull();
  });
});

describe("criptografia de credenciais (AES-256-GCM)", () => {
  const originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  afterEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
  });

  it("cifra e decifra, sem texto puro no resultado", () => {
    const secret = encryptSecret("sk-ant-api03-SEGREDO", "user-1:ANTHROPIC");
    expect(JSON.stringify(secret)).not.toContain("SEGREDO");
    expect(decryptSecret(secret, "user-1:ANTHROPIC")).toBe("sk-ant-api03-SEGREDO");
  });

  it("falha ao decifrar com outro dono (AAD diferente)", () => {
    const secret = encryptSecret("chave-do-usuario-1", "user-1:OPENAI");
    expect(() => decryptSecret(secret, "user-2:OPENAI")).toThrow();
  });

  it("falha se o texto cifrado for adulterado", () => {
    const secret = encryptSecret("chave", "ctx");
    const tampered = Buffer.from(secret.ciphertext, "base64");
    tampered[0] = tampered[0]! ^ 0xff;
    expect(() => decryptSecret({ ...secret, ciphertext: tampered.toString("base64") }, "ctx")).toThrow();
  });

  it("recusa operar sem chave configurada ou com chave de tamanho errado", () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret("x", "ctx")).toThrow(EncryptionNotConfiguredError);

    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(16).toString("base64");
    expect(isEncryptionConfigured()).toBe(false);
  });
});

describe("códigos de primeiro acesso", () => {
  it("gera códigos de 20 caracteres em 5 grupos", () => {
    const code = generateSetupCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
    expect(generateSetupCode()).not.toBe(code);
  });

  it("normaliza o código digitado (caixa, espaços, O/0, I/L/1)", () => {
    expect(normalizeSetupCode("abcd-ef0i lo12")).toBe("ABCDEF01101" + "2");
    expect(hashSetupCode("ab12-cd34")).toBe(hashSetupCode("AB12CD34"));
  });
});
