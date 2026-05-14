import { describe, it, expect } from 'vitest';
import { fmtMoneyInput, parseMoney, numToMoneyStr } from '@/utils/formatters';

// ─── fmtMoneyInput ────────────────────────────────────────────────────────────

describe('fmtMoneyInput', () => {
  it('retorna cadena vacía para input vacío', () => {
    expect(fmtMoneyInput('')).toBe('');
  });

  it('formatea número de 4 dígitos con punto de miles', () => {
    expect(fmtMoneyInput('1000')).toBe('1.000');
  });

  it('formatea número de 7 dígitos con dos puntos de miles', () => {
    expect(fmtMoneyInput('1000000')).toBe('1.000.000');
  });

  it('formatea número sin separador para menos de 4 dígitos', () => {
    expect(fmtMoneyInput('999')).toBe('999');
    expect(fmtMoneyInput('1')).toBe('1');
  });

  it('elimina caracteres no numéricos antes de formatear', () => {
    expect(fmtMoneyInput('abc123')).toBe('123');
    expect(fmtMoneyInput('$50.000')).toBe('50.000');
  });

  it('re-formatea correctamente un valor ya con puntos', () => {
    expect(fmtMoneyInput('1.000')).toBe('1.000');
    expect(fmtMoneyInput('1.000.000')).toBe('1.000.000');
  });

  it('maneja valor de 10 dígitos (millones)', () => {
    expect(fmtMoneyInput('1234567890')).toBe('1.234.567.890');
  });

  it('retorna cadena vacía para solo caracteres no numéricos', () => {
    expect(fmtMoneyInput('---')).toBe('');
  });
});

// ─── parseMoney ───────────────────────────────────────────────────────────────

describe('parseMoney', () => {
  it('retorna 0 para cadena vacía', () => {
    expect(parseMoney('')).toBe(0);
  });

  it('parsea string con puntos de miles a entero', () => {
    expect(parseMoney('1.234.567')).toBe(1234567);
  });

  it('parsea string sin puntos a entero', () => {
    expect(parseMoney('50000')).toBe(50000);
  });

  it('retorna 0 para texto no numérico', () => {
    expect(parseMoney('abc')).toBe(0);
  });

  it('retorna 0 para el string "0"', () => {
    expect(parseMoney('0')).toBe(0);
  });

  it('parsea string con un solo punto', () => {
    expect(parseMoney('1.000')).toBe(1000);
  });

  it('es la inversa de fmtMoneyInput para números positivos', () => {
    const valor = 1250000;
    expect(parseMoney(fmtMoneyInput(String(valor)))).toBe(valor);
  });
});

// ─── numToMoneyStr ────────────────────────────────────────────────────────────

describe('numToMoneyStr', () => {
  it('retorna cadena vacía para 0', () => {
    expect(numToMoneyStr(0)).toBe('');
  });

  it('retorna cadena vacía para valores negativos', () => {
    expect(numToMoneyStr(-100)).toBe('');
    expect(numToMoneyStr(-0.01)).toBe('');
  });

  it('formatea 1000 con separador de miles', () => {
    expect(numToMoneyStr(1000)).toBe('1.000');
  });

  it('formatea millones correctamente', () => {
    expect(numToMoneyStr(1000000)).toBe('1.000.000');
  });

  it('redondea decimales al peso más cercano', () => {
    expect(numToMoneyStr(1000.7)).toBe('1.001');
    expect(numToMoneyStr(999.3)).toBe('999');
  });

  it('formatea valores de 3 dígitos sin punto', () => {
    expect(numToMoneyStr(500)).toBe('500');
  });
});
