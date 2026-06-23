import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseOrThrow } from './validation';

describe('validation helpers', () => {
  it('returns parsed values for valid input', () => {
    const schema = z.object({ name: z.string().trim().min(1) });

    expect(parseOrThrow(schema, { name: ' Checking ' })).toEqual({ name: 'Checking' });
  });

  it('throws readable issue messages for invalid input', () => {
    const schema = z.object({
      name: z.string().trim().min(1, 'Name is required.'),
      amount: z.number().int('Amount must be whole cents.'),
    });

    expect(() => parseOrThrow(schema, { name: '', amount: 1.5 })).toThrow(
      'Name is required. Amount must be whole cents.',
    );
  });
});
