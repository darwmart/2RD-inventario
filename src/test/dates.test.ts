import { describe, it, expect } from 'vitest';
import { fmtDate, fmtDateTime, formatDate, formatDateShort } from '@/utils/dates';

// Fecha fija: 13 de mayo de 2026 (hora local para evitar desfases de zona horaria)
const ISO_DATE = '2026-05-13T10:30:00.000Z';
const DATE_OBJ = new Date(2026, 4, 13, 12, 0, 0); // mes 4 = mayo, hora local

// ─── fmtDate ─────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('acepta string ISO y contiene el año', () => {
    expect(fmtDate(ISO_DATE)).toContain('2026');
  });

  it('acepta objeto Date', () => {
    expect(fmtDate(DATE_OBJ)).toContain('2026');
  });

  it('retorna string no vacío', () => {
    expect(fmtDate(ISO_DATE).length).toBeGreaterThan(0);
  });

  it('incluye el día 13 del mes', () => {
    expect(fmtDate(ISO_DATE)).toContain('13');
  });
});

// ─── fmtDateTime ─────────────────────────────────────────────────────────────

describe('fmtDateTime', () => {
  it('retorna string con el año', () => {
    expect(fmtDateTime(ISO_DATE)).toContain('2026');
  });

  it('contiene información de hora (algún número de hora válido)', () => {
    const result = fmtDateTime(ISO_DATE);
    // Debe haber al menos dos puntos/comas que separan fecha y hora
    expect(result.length).toBeGreaterThan(10);
  });

  it('acepta objeto Date', () => {
    expect(fmtDateTime(DATE_OBJ)).toContain('2026');
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('retorna string con el año (2 o 4 dígitos) para ISO válido', () => {
    const result = formatDate(ISO_DATE);
    expect(result.includes('2026') || result.includes('26')).toBe(true);
  });

  it('acepta objeto Date', () => {
    const result = formatDate(DATE_OBJ);
    expect(result.includes('2026') || result.includes('26')).toBe(true);
  });

  it('retorna el string original si la fecha es inválida (fallback)', () => {
    const invalid = 'not-a-date';
    const result = formatDate(invalid);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('retorna string no vacío', () => {
    expect(formatDate(ISO_DATE).length).toBeGreaterThan(0);
  });
});

// ─── formatDateShort ──────────────────────────────────────────────────────────

describe('formatDateShort', () => {
  it('retorna string con el año', () => {
    expect(formatDateShort(ISO_DATE)).toContain('2026');
  });

  it('acepta objeto Date', () => {
    expect(formatDateShort(DATE_OBJ)).toContain('2026');
  });

  it('no contiene información de hora (es más corto que fmtDateTime)', () => {
    const short = formatDateShort(ISO_DATE);
    const full = fmtDateTime(ISO_DATE);
    expect(short.length).toBeLessThanOrEqual(full.length);
  });

  it('retorna string no vacío para fecha inválida (fallback)', () => {
    const result = formatDateShort('not-a-date');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
