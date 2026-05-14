import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────
export type SearchResultType = 'product' | 'customer' | 'sale' | 'supplier';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  url?: string;
}

// ─── Búsqueda en Supabase ─────────────────────────────────────
async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim() || query.length < 2) return [];

  const q = `%${query}%`;
  const results: SearchResult[] = [];

  if (!supabase) return [];

  // Ejecutar búsquedas en paralelo
  const [products, customers, sales, suppliers] = await Promise.allSettled([
    supabase
      .from('products')
      .select('id, name, barcode, reference, current_price, stock')
      .or(`name.ilike.${q},barcode.eq.${query},reference.ilike.${q}`)
      .is('deleted_at', null)
      .limit(5),

    supabase
      .from('customers')
      .select('id, full_name, document, phone, email')
      .or(`full_name.ilike.${q},document.ilike.${q},phone.ilike.${q}`)
      .is('deleted_at', null)
      .limit(5),

    supabase
      .from('sales')
      .select('id, sale_number, total, status, type, created_at, advisor_name')
      .ilike('sale_number', q)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('suppliers')
      .select('id, commercial_name, fiscal_name, tax_id, phone')
      .or(`commercial_name.ilike.${q},fiscal_name.ilike.${q},tax_id.ilike.${q}`)
      .is('deleted_at', null)
      .limit(3),
  ]);

  if (products.status === 'fulfilled' && products.value.data) {
    for (const p of products.value.data) {
      results.push({
        id: p.id,
        type: 'product',
        title: p.name,
        subtitle: p.barcode ? `Código: ${p.barcode}` : p.reference ?? '',
        meta: `$${Number(p.current_price).toLocaleString('es-CO')} · Stock: ${p.stock}`,
        url: '/inventory',
      });
    }
  }

  if (customers.status === 'fulfilled' && customers.value.data) {
    for (const c of customers.value.data) {
      results.push({
        id: c.id,
        type: 'customer',
        title: c.full_name,
        subtitle: c.document ? `Doc: ${c.document}` : '',
        meta: c.phone ?? c.email ?? '',
        url: '/customers',
      });
    }
  }

  if (sales.status === 'fulfilled' && sales.value.data) {
    for (const s of sales.value.data) {
      results.push({
        id: s.id,
        type: 'sale',
        title: s.sale_number,
        subtitle: s.advisor_name,
        meta: `$${Number(s.total).toLocaleString('es-CO')} · ${s.status}`,
        url: '/sales',
      });
    }
  }

  if (suppliers.status === 'fulfilled' && suppliers.value.data) {
    for (const s of suppliers.value.data) {
      results.push({
        id: s.id,
        type: 'supplier',
        title: s.commercial_name ?? s.fiscal_name,
        subtitle: `NIT: ${s.tax_id}`,
        meta: s.phone ?? '',
        url: '/suppliers',
      });
    }
  }

  return results;
}

// ─── Hook con debounce ────────────────────────────────────────
export function useGlobalSearchQuery(query: string) {
  return useQuery({
    queryKey: ['global_search', query],
    queryFn: () => searchAll(query),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30, // 30 segundos
    placeholderData: (prev) => prev,
  });
}

// ─── Hook de estado del buscador ─────────────────────────────
export function useSearchState() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 200);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return { isOpen, query, debouncedQuery, open, close, handleQueryChange };
}
