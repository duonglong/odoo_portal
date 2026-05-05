import { describe, it, expect } from 'vitest';
import { odooToDate } from '../src/utils.js';

describe('odooToDate', () => {
    it('parses Odoo UTC datetime string (no timezone)', () => {
        const d = odooToDate('2026-01-15 08:30:00');
        expect(d).toBeInstanceOf(Date);
        expect(d!.toISOString()).toBe('2026-01-15T08:30:00.000Z');
    });

    it('parses ISO UTC string (Z suffix)', () => {
        const d = odooToDate('2026-01-15T08:30:00Z');
        expect(d).toBeInstanceOf(Date);
        expect(d!.toISOString()).toBe('2026-01-15T08:30:00.000Z');
    });

    it('parses ISO string with positive offset', () => {
        const d = odooToDate('2026-01-15T15:30:00+07:00');
        expect(d).toBeInstanceOf(Date);
        expect(d!.toISOString()).toBe('2026-01-15T08:30:00.000Z');
    });

    it('parses ISO string with negative offset', () => {
        const d = odooToDate('2026-01-15T03:30:00-05:00');
        expect(d).toBeInstanceOf(Date);
        expect(d!.toISOString()).toBe('2026-01-15T08:30:00.000Z');
    });

    it('parses date-only string as UTC midnight', () => {
        const d = odooToDate('2026-01-15');
        expect(d).toBeInstanceOf(Date);
        expect(d!.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    });

    it('returns null for false', () => {
        expect(odooToDate(false)).toBeNull();
    });

    it('returns null for null', () => {
        expect(odooToDate(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(odooToDate(undefined)).toBeNull();
    });
});
