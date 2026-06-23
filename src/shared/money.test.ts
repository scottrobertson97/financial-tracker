import { describe, expect, it } from 'vitest';
import { centsToDollars, dollarsToCents, formatCurrency } from './money';

describe('money utilities', () => {
  it.each([
    ['12', 1200],
    ['12.3', 1230],
    ['12.34', 1234],
    ['0.99', 99],
    ['-5.00', -500],
    ['$1,234.56', 123456],
  ])('converts %s to integer cents', (input, expected) => {
    expect(dollarsToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '12.345', '$', '1,23.00', '12 dollars', '1.2.3'])(
    'rejects invalid input %s',
    (input) => {
      expect(() => dollarsToCents(input)).toThrow(/Invalid money amount/);
    },
  );

  it('formats integer cents as a dollars string', () => {
    expect(centsToDollars(1234)).toBe('12.34');
    expect(centsToDollars(-500)).toBe('-5.00');
  });

  it('formats integer cents as currency', () => {
    expect(formatCurrency(1234)).toBe('$12.34');
    expect(formatCurrency(-1234)).toBe('-$12.34');
  });
});
