import { describe, expect, it } from 'vitest';
import {
  formatMonthLabel,
  getCurrentDateIso,
  getDaysInMonth,
  getMonthEndDate,
  getMonthKeysEndingAt,
  getPreviousMonthKey,
} from './dates';

describe('date helpers', () => {
  it('formats local dates and month labels', () => {
    expect(getCurrentDateIso(new Date(2026, 6, 5))).toBe('2026-07-05');
    expect(formatMonthLabel('2026-07')).toBe('Jul 2026');
  });

  it('builds calendar ranges across year boundaries', () => {
    expect(getMonthKeysEndingAt('2026-02', 6)).toEqual([
      '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
    ]);
    expect(getPreviousMonthKey('2026-01')).toBe('2025-12');
  });

  it('handles normal and leap-year month endings', () => {
    expect(getDaysInMonth('2024-02')).toBe(29);
    expect(getDaysInMonth('2025-02')).toBe(28);
    expect(getMonthEndDate('2026-04')).toBe('2026-04-30');
  });

  it('rejects invalid month keys', () => {
    expect(() => getMonthKeysEndingAt('2026-13', 2)).toThrow('Invalid month key');
  });
});
