import { z } from 'zod';

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new Error(formatZodError(result.error));
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(' ');
}
