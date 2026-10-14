/**
 * Erros de domínio. A camada HTTP converte cada código em um status adequado
 * e usa `message` como texto seguro para o usuário (nunca contém segredos).
 */
type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PRECONDITION_FAILED";

const statusByCode: Record<DomainErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PRECONDITION_FAILED: 412,
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = statusByCode[code];
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
