export interface PrismaError extends Error {
  code: string;
  meta?: {
    target?: string[];
    [key: string]: unknown;
  };
}

export function isPrismaError(error: unknown): error is PrismaError {
  return (
    error instanceof Error && 'code' in error && typeof (error as PrismaError).code === 'string'
  );
}
