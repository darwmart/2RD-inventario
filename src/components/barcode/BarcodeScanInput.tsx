import { useRef, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  onScan: (code: string) => void;
  /** ms máximos entre keystrokes para clasificar como scanner USB. Default 50 */
  maxKeystrokeMs?: number;
  /** Longitud mínima para disparar onScan. Default 4 */
  minLength?: number;
}

/**
 * Input controlado que detecta lectores de código de barras USB/HID.
 * Los scanners envían todos los caracteres en ráfaga (<50ms entre teclas) + Enter.
 * Cuando se detecta ese patrón, dispara onScan con el código completo en lugar de
 * llamar a onChange carácter por carácter.
 */
const BarcodeScanInput = forwardRef<HTMLInputElement, Props>(
  ({ onScan, maxKeystrokeMs = 50, minLength = 4, className, onKeyDown, onChange, value, ...rest }, ref) => {
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const isScanningRef = useRef(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const buf = bufferRef.current;
        if (isScanningRef.current && buf.length >= minLength) {
          e.preventDefault();
          onScan(buf);
          bufferRef.current = '';
          isScanningRef.current = false;
          return;
        }
        bufferRef.current = '';
        isScanningRef.current = false;
        onKeyDown?.(e);
        return;
      }

      if (e.key.length === 1) {
        if (elapsed < maxKeystrokeMs) {
          isScanningRef.current = true;
          bufferRef.current += e.key;
        } else {
          isScanningRef.current = false;
          bufferRef.current = e.key;
        }
      }

      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        {...rest}
        value={value}
        className={cn(className)}
        onKeyDown={handleKeyDown}
        onChange={onChange}
      />
    );
  }
);

BarcodeScanInput.displayName = 'BarcodeScanInput';
export default BarcodeScanInput;
