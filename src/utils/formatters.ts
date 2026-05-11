/**
 * Formatea un string de entrada numérica con puntos como separadores de miles (estilo colombiano).
 * Elimina todo carácter no numérico y aplica la máscara de miles.
 * Uso: en campos <input> para que el usuario vea "1.234.567" mientras escribe.
 */
export function fmtMoneyInput(s: string): string {
  const raw = s.replace(/\D/g, '');
  return raw === '' ? '' : raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Convierte un número a string con separadores de miles (toLocaleString es-CO).
 * Retorna cadena vacía si el número es 0 o negativo.
 * Uso: para mostrar montos en campos de texto (sin símbolo $).
 */
export function numToMoneyStr(n: number): string {
  return n > 0 ? Math.round(n).toLocaleString('es-CO') : '';
}

/**
 * Parsea un string con puntos de miles a número entero.
 * Ej: "1.234.567" → 1234567
 */
export function parseMoney(s: string): number {
  return parseInt(s.replace(/\./g, ''), 10) || 0;
}
