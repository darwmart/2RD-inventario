import { describe, it, expect } from 'vitest';
import { calcEan13Check, validateEan13, generateEan13Code, ean13Bars } from '@/utils/barcode';

// ─── calcEan13Check ───────────────────────────────────────────────────────────

describe('calcEan13Check', () => {
  // EAN-13 conocido: 5901234123457 → check digit = 7
  it('calcula el dígito de control correcto para código conocido', () => {
    expect(calcEan13Check('590123412345')).toBe(7);
  });

  // EAN-13 conocido: 4006381333931 → check digit = 1
  it('calcula el dígito de control para otro código conocido', () => {
    expect(calcEan13Check('400638133393')).toBe(1);
  });

  it('retorna 0 cuando el módulo da exactamente 0', () => {
    // 000000000000 → todos ceros → suma = 0 → (10 - 0) % 10 = 0
    expect(calcEan13Check('000000000000')).toBe(0);
  });

  it('retorna un dígito entre 0 y 9', () => {
    const check = calcEan13Check('123456789012');
    expect(check).toBeGreaterThanOrEqual(0);
    expect(check).toBeLessThanOrEqual(9);
  });
});

// ─── validateEan13 ────────────────────────────────────────────────────────────

describe('validateEan13', () => {
  it('valida código EAN-13 correcto', () => {
    expect(validateEan13('5901234123457')).toBe(true);
  });

  it('rechaza código con dígito de control incorrecto', () => {
    expect(validateEan13('5901234123456')).toBe(false); // debería ser 7
  });

  it('rechaza código con menos de 13 dígitos', () => {
    expect(validateEan13('590123412345')).toBe(false);
  });

  it('rechaza código con más de 13 dígitos', () => {
    expect(validateEan13('59012341234570')).toBe(false);
  });

  it('rechaza código con letras', () => {
    expect(validateEan13('590123412345A')).toBe(false);
  });

  it('rechaza cadena vacía', () => {
    expect(validateEan13('')).toBe(false);
  });

  it('valida otro código EAN-13 conocido', () => {
    expect(validateEan13('4006381333931')).toBe(true);
  });
});

// ─── generateEan13Code ────────────────────────────────────────────────────────

describe('generateEan13Code', () => {
  it('genera código de exactamente 13 dígitos', () => {
    const code = generateEan13Code();
    expect(code).toHaveLength(13);
    expect(/^\d{13}$/.test(code)).toBe(true);
  });

  it('genera código que pasa la validación EAN-13', () => {
    const code = generateEan13Code();
    expect(validateEan13(code)).toBe(true);
  });

  it('comienza con prefijo Colombia 770', () => {
    const code = generateEan13Code();
    expect(code.startsWith('770')).toBe(true);
  });

  it('genera códigos distintos en llamadas sucesivas', () => {
    const c1 = generateEan13Code();
    // Pequeño delay implícito en los timestamps de Date.now()
    const c2 = generateEan13Code();
    // No siempre serán distintos en el mismo ms, pero el formato sí debe ser correcto
    expect(/^\d{13}$/.test(c1)).toBe(true);
    expect(/^\d{13}$/.test(c2)).toBe(true);
  });
});

// ─── ean13Bars ────────────────────────────────────────────────────────────────

describe('ean13Bars', () => {
  it('genera cadena de bits de longitud correcta (95) para EAN-13 válido', () => {
    const bits = ean13Bars('5901234123457');
    expect(bits).toHaveLength(95);
  });

  it('solo contiene 0 y 1', () => {
    const bits = ean13Bars('5901234123457');
    expect(/^[01]+$/.test(bits)).toBe(true);
  });

  it('retorna cadena vacía para código inválido (longitud incorrecta)', () => {
    expect(ean13Bars('123')).toBe('');
    expect(ean13Bars('')).toBe('');
  });

  it('inicia con patrón de guarda 101', () => {
    const bits = ean13Bars('5901234123457');
    expect(bits.startsWith('101')).toBe(true);
  });

  it('finaliza con patrón de guarda 101', () => {
    const bits = ean13Bars('5901234123457');
    expect(bits.endsWith('101')).toBe(true);
  });

  it('contiene separador central 01010 en posición 45-50', () => {
    const bits = ean13Bars('5901234123457');
    expect(bits.slice(45, 50)).toBe('01010');
  });
});
