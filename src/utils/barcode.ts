import JsBarcode from 'jsbarcode';

export function calcEan13Check(digits12: string): number {
  const d = digits12.split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function validateEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return calcEan13Check(code.slice(0, 12)) === Number(code[12]);
}

export function generateEan13Code(): string {
  const base = '770' + String(Date.now()).slice(-9);
  return base + calcEan13Check(base);
}

function resolveFormat(code: string): string {
  // Validar dígito de verificación antes de usar EAN13/EAN8/UPCA.
  // Si el código no pasa la validación, CODE128 puede codificar cualquier string.
  if (/^\d{13}$/.test(code)) return validateEan13(code) ? 'EAN13' : 'CODE128';
  if (/^\d{8}$/.test(code))  return 'EAN8';
  if (/^\d{12}$/.test(code)) return 'UPCA';
  return 'CODE128';
}

function renderToSvg(
  code: string,
  opts: { width: number; height: number; fontSize: number },
): SVGSVGElement | null {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  const format = resolveFormat(code);

  const tryRender = (fmt: string): boolean => {
    try {
      JsBarcode(svgEl, code, {
        format: fmt,
        width:        opts.width,
        height:       opts.height,
        fontSize:     opts.fontSize,
        displayValue: true,
        margin:       4,
        background:   '#ffffff',
        xmlDocument:  document,
      });
      return true;
    } catch {
      return false;
    }
  };

  if (!tryRender(format) && (format !== 'CODE128' ? !tryRender('CODE128') : true)) {
    return null;
  }
  return svgEl;
}

/**
 * Devuelve el SVG como string listo para incrustarse inline en HTML de impresión.
 * Usa SVG inline (NO data-URI) para garantizar renderizado en popup de print.
 */
export function generateBarcodeSvgRaw(
  code: string,
  opts: { width?: number; height?: number; fontSize?: number } = {},
): string {
  if (!code) return '';
  const { width = 2, height = 60, fontSize = 12 } = opts;
  const svgEl = renderToSvg(code, { width, height, fontSize });
  if (!svgEl) return '';
  // Quitar dimensiones fijas y dejar que el contenedor CSS controle el tamaño
  const raw = new XMLSerializer().serializeToString(svgEl);
  return raw.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
    const wm = attrs.match(/\swidth="(\d+(?:\.\d+)?)"/);
    const hm = attrs.match(/\sheight="(\d+(?:\.\d+)?)"/);
    const vw = wm ? wm[1] : '200';
    const vh = hm ? hm[1] : '60';
    let a = attrs.replace(/\s(?:width|height)="[^"]*"/g, '');
    if (!a.includes('viewBox')) a += ` viewBox="0 0 ${vw} ${vh}"`;
    return `<svg${a} preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:100%;">`;
  });
}

/**
 * Genera un SVG en base64-dataURI (para uso en <img> fuera de contextos de impresión).
 */
export function generateBarcodeSvg(
  code: string,
  opts: { width?: number; height?: number; fontSize?: number } = {},
): string {
  if (!code) return '';
  const { width = 2, height = 60, fontSize = 12 } = opts;
  const svgEl = renderToSvg(code, { width, height, fontSize });
  if (!svgEl) return '';
  const serialized = new XMLSerializer().serializeToString(svgEl);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
}

/** @deprecated Usar generateBarcodeSvg. Mantenida para compatibilidad. */
export function ean13Bars(code: string): string {
  const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  if (!/^\d{13}$/.test(code)) return '';
  const p = PARITY[parseInt(code[0])];
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += p[i] === 'L' ? L[parseInt(code[i + 1])] : G[parseInt(code[i + 1])];
  bits += '01010';
  for (let i = 0; i < 6; i++) bits += R[parseInt(code[i + 7])];
  return bits + '101';
}
