import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, ShoppingCart, Truck, Loader2 } from 'lucide-react';
import {
  useSearchState,
  useGlobalSearchQuery,
  type SearchResult,
  type SearchResultType,
} from '@/hooks/useGlobalSearch';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// ─── Icono por tipo de resultado ─────────────────────────────
const TypeIcon: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  product: Package,
  customer: Users,
  sale: ShoppingCart,
  supplier: Truck,
};

const TypeLabel: Record<SearchResultType, string> = {
  product: 'Producto',
  customer: 'Cliente',
  sale: 'Venta',
  supplier: 'Proveedor',
};

const TypeColor: Record<SearchResultType, string> = {
  product: 'text-blue-600',
  customer: 'text-green-600',
  sale: 'text-orange-600',
  supplier: 'text-purple-600',
};

// ─── Componente principal ─────────────────────────────────────
export function GlobalSearch() {
  const navigate = useNavigate();
  const {
    isOpen, query, debouncedQuery,
    open, close, handleQueryChange,
  } = useSearchState();

  const { data: results = [], isFetching } = useGlobalSearchQuery(debouncedQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Abrir con Ctrl+K
  useGlobalSearch(open);

  // Focus automático al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    close();
    if (result.url) navigate(result.url);
  };

  // Agrupar por tipo
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <>
      {/* Trigger visual en el layout */}
      <button
        onClick={open}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors border border-border w-full max-w-xs"
      >
        <Search className="h-4 w-4" />
        <span>Buscar...</span>
        <kbd className="ml-auto text-xs bg-background border border-border rounded px-1 py-0.5">
          Ctrl+K
        </kbd>
      </button>

      <Dialog open={isOpen} onOpenChange={(v) => { if (!v) close(); }}>
        <DialogContent className="p-0 max-w-xl overflow-hidden">
          {/* Campo de búsqueda */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            {isFetching
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            }
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar productos, clientes, ventas, proveedores..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base"
            />
          </div>

          {/* Resultados */}
          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}

            {query.length >= 2 && !isFetching && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Sin resultados para &quot;{query}&quot;
              </div>
            )}

            {Object.entries(grouped).map(([type, items]) => {
              const Icon = TypeIcon[type as SearchResultType];
              const label = TypeLabel[type as SearchResultType];
              const color = TypeColor[type as SearchResultType];
              return (
                <div key={type}>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 flex items-center gap-1.5">
                    <Icon className={`h-3 w-3 ${color}`} />
                    {label}s
                  </div>
                  {items.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                    >
                      <Icon className={`h-4 w-4 ${color} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        )}
                      </div>
                      {result.meta && (
                        <span className="text-xs text-muted-foreground shrink-0">{result.meta}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer con shortcuts */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t flex gap-4 text-xs text-muted-foreground bg-muted/20">
              <span><kbd className="bg-background border rounded px-1">↵</kbd> Seleccionar</span>
              <span><kbd className="bg-background border rounded px-1">Esc</kbd> Cerrar</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
