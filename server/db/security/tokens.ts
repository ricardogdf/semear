import { createHash, randomBytes, randomInt } from "node:crypto";

/** Token opaco de sessão (256 bits). Só o hash SHA-256 é persistido. */
export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Alfabeto Crockford base32 (sem I, L, O, U) para códigos legíveis e sem ambiguidade.
const SETUP_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SETUP_CODE_GROUPS = 5;
const SETUP_CODE_GROUP_SIZE = 4;

/** Código de primeiro acesso: 20 caracteres base32 (100 bits), em grupos de 4. */
export function generateSetupCode() {
  const groups: string[] = [];
  for (let group = 0; group < SETUP_CODE_GROUPS; group += 1) {
    let chunk = "";
    for (let index = 0; index < SETUP_CODE_GROUP_SIZE; index += 1) {
      chunk += SETUP_CODE_ALPHABET[randomInt(SETUP_CODE_ALPHABET.length)];
    }
    groups.push(chunk);
  }
  return groups.join("-");
}

/** Normaliza o código digitado (maiúsculas, sem espaços/hífens, O→0, I/L→1). */
export function normalizeSetupCode(code: string) {
  return code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function hashSetupCode(code: string) {
  return hashToken(`setup:${normalizeSetupCode(code)}`);
}
