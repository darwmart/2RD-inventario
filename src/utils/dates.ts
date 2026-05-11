/**
 * Formatea una fecha a string corto con locale colombiana.
 * Ej: "04/05/2026"
 */
export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formatea una fecha con hora y minutos.
 * Ej: "04/05/2026, 10:30"
 */
export function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Formatea fecha + hora corta con manejo de errores.
 * Ej: "4/5/2026, 10:30 a. m."
 * Equivalente a la función formatDate de Warehouses.tsx.
 */
export function formatDate(date: Date | string): string {
  try {
    return new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(date);
  }
}

/**
 * Formatea solo la fecha con manejo de errores.
 * Equivalente a formatDateShort de Warehouses.tsx.
 */
export function formatDateShort(date: Date | string): string {
  try {
    return new Date(date).toLocaleDateString('es-CO');
  } catch {
    return String(date);
  }
}
