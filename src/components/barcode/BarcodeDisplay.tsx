import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface Props {
  value: string;
  /** Code128 (default) | EAN13 | EAN8 | UPCA */
  format?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

export default function BarcodeDisplay({
  value,
  format,
  width = 2,
  height = 60,
  fontSize = 12,
  displayValue = true,
  className,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const resolveFormat = (code: string, hint?: string): string => {
    if (hint) return hint;
    if (/^\d{13}$/.test(code)) return 'EAN13';
    if (/^\d{8}$/.test(code)) return 'EAN8';
    if (/^\d{12}$/.test(code)) return 'UPCA';
    return 'CODE128';
  };

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: resolveFormat(value, format),
        width,
        height,
        fontSize,
        displayValue,
        margin: 4,
        background: 'transparent',
      });
    } catch {
      // código inválido para el formato — no renderizar nada
    }
  }, [value, format, width, height, fontSize, displayValue]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}
