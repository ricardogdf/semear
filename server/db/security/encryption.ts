import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { DomainError } from "../errors";

/**
 * Criptografia autenticada (AES-256-GCM) para credenciais de IA em repouso.
 * A chave vem de CREDENTIALS_ENCRYPTION_KEY (32 bytes em base64), fora do banco e do repositório.
 * O AAD vincula o texto cifrado ao dono e ao provedor: copiar a linha para outro usuário
 * faz a decifragem falhar.
 */
const CURRENT_ENCRYPTION_KEY_VERSION = 1;

interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export class EncryptionNotConfiguredError extends DomainError {
  constructor() {
    super(
      "PRECONDITION_FAILED",
      "O armazenamento seguro de credenciais de IA não está configurado no servidor (CREDENTIALS_ENCRYPTION_KEY). Contate o administrador.",
    );
    this.name = "EncryptionNotConfiguredError";
  }
}

function loadKey(version: number): Buffer {
  if (version !== CURRENT_ENCRYPTION_KEY_VERSION) {
    throw new EncryptionNotConfiguredError();
  }

  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new EncryptionNotConfiguredError();
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new EncryptionNotConfiguredError();
  }
  return key;
}

export function isEncryptionConfigured() {
  try {
    loadKey(CURRENT_ENCRYPTION_KEY_VERSION);
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string, associatedData: string): EncryptedSecret {
  const key = loadKey(CURRENT_ENCRYPTION_KEY_VERSION);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: CURRENT_ENCRYPTION_KEY_VERSION,
  };
}

export function decryptSecret(secret: EncryptedSecret, associatedData: string): string {
  const key = loadKey(secret.keyVersion);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
