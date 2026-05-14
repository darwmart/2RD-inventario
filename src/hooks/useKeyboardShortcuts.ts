import { useEffect, useCallback, useRef } from 'react';

// ─── Tipos ────────────────────────────────────────────────────
type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta';

interface Shortcut {
  key: string;             // 'F1', 'F4', 'k', 'p', etc.
  modifiers?: Modifier[];  // ['ctrl'], ['ctrl', 'shift'], etc.
  handler: (e: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
  // Si true, no activa cuando el foco está en un input/textarea
  ignoreInInputs?: boolean;
}

// ─── Hook principal ───────────────────────────────────────────
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  // Ref para evitar closures stale (el handler siempre ve el estado actual)
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.ignoreInInputs && inInput) continue;

        const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatch) continue;

        const mods = shortcut.modifiers ?? [];
        const ctrlMatch  = mods.includes('ctrl')  ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const altMatch   = mods.includes('alt')   ? e.altKey  : !e.altKey;
        const shiftMatch = mods.includes('shift') ? e.shiftKey : !e.shiftKey;

        if (ctrlMatch && altMatch && shiftMatch) {
          if (shortcut.preventDefault !== false) e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — shortcutsRef is always updated
}

// ─── Hook POS: atajos del punto de venta ─────────────────────
interface POSShortcutHandlers {
  onNewSale?: () => void;
  onSearchProduct?: () => void;
  onCheckout?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
  onNewQuote?: () => void;
  onOpenCash?: () => void;
}

export function usePOSShortcuts(handlers: POSShortcutHandlers) {
  const stableHandlers = useRef(handlers);
  stableHandlers.current = handlers;

  useKeyboardShortcuts([
    {
      key: 'F1',
      handler: () => stableHandlers.current.onNewSale?.(),
      description: 'Nueva venta',
      ignoreInInputs: false,
    },
    {
      key: 'F2',
      handler: () => stableHandlers.current.onSearchProduct?.(),
      description: 'Buscar producto',
      ignoreInInputs: false,
    },
    {
      key: 'F4',
      handler: () => stableHandlers.current.onCheckout?.(),
      description: 'Cobrar',
      ignoreInInputs: false,
    },
    {
      key: 'Escape',
      handler: () => stableHandlers.current.onCancel?.(),
      description: 'Cancelar',
      ignoreInInputs: false,
    },
    {
      key: 'p',
      modifiers: ['ctrl'],
      handler: () => stableHandlers.current.onPrint?.(),
      description: 'Imprimir',
    },
    {
      key: 'F5',
      handler: () => stableHandlers.current.onNewQuote?.(),
      description: 'Nueva cotización',
      ignoreInInputs: false,
    },
    {
      key: 'F8',
      handler: () => stableHandlers.current.onOpenCash?.(),
      description: 'Abrir caja',
      ignoreInInputs: false,
    },
  ]);
}

// ─── Hook de búsqueda global CMD+K ───────────────────────────
export function useGlobalSearch(onOpen: () => void) {
  useKeyboardShortcuts([
    {
      key: 'k',
      modifiers: ['ctrl'],
      handler: onOpen,
      description: 'Búsqueda global',
    },
  ]);
}

// ─── Hook genérico de un solo atajo ──────────────────────────
export function useShortcut(
  key: string,
  handler: () => void,
  options: { modifiers?: Modifier[]; ignoreInInputs?: boolean } = {},
) {
  const stableHandler = useCallback(handler, []); // eslint-disable-line react-hooks/exhaustive-deps
  useKeyboardShortcuts([{ key, handler: stableHandler, ...options }]);
}
