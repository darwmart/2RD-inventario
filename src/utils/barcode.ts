const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

/**
 * Genera el string de 95 bits para renderizar un código de barras EAN-13.
 * Retorna '' si el código no tiene exactamente 13 dígitos.
 */
export function ean13Bars(code: string): string {
  if (!/^\d{13}$/.test(code)) return '';
  const p = PARITY[parseInt(code[0])];
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += p[i] === 'L' ? L[parseInt(code[i + 1])] : G[parseInt(code[i + 1])];
  bits += '01010';
  for (let i = 0; i < 6; i++) bits += R[parseInt(code[i + 7])];
  return bits + '101';
}

/**
 * Calcula el dígito verificador EAN-13 a partir de los primeros 12 dígitos.
 */
export function calcEan13Check(digits12: string): number {
  const d = digits12.split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

/**
 * Valida que un código de 13 dígitos sea un EAN-13 correcto.
 */
export function validateEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return calcEan13Check(code.slice(0, 12)) === Number(code[12]);
}

/**
 * Genera un código EAN-13 con prefijo Colombia (770) basado en timestamp.
 * Retorna el código de 13 dígitos como string.
 */
export function generateEan13Code(): string {
  const base = '770' + String(Date.now()).slice(-9);
  const check = calcEan13Check(base);
  return base + check;
}
