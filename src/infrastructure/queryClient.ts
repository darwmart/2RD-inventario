import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,          // 30 segundos — reducir refetches innecesarios
      gcTime: 10 * 60 * 1000,        // 10 minutos en memoria
      retry: (failureCount, error) => {
        // No reintentar en errores de autenticación o permisos
        const msg = (error as Error).message ?? '';
        if (msg.includes('JWT') || msg.includes('Unauthorized') || msg.includes('permission')) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,      // Refetch al recuperar conexión
      networkMode: 'offlineFirst',   // React Query no cancela queries offline
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

// Mapa completo de claves localStorage → query keys de React Query.
// Cada vez que un repositorio llama write() se emite 'ls-change' con la clave
// y aquí invalidamos las queries correspondientes.
const KEY_MAP: Record<string, string[][]> = {
  products:        [['products']],
  categories:      [['categories']],
  suppliers:       [['suppliers']],
  sales:           [['sales']],
  customers:       [['customers']],
  advisors:        [['advisors']],
  paymentMethods:  [['paymentMethods']],
  expenses:        [['expenses']],
  banks:           [['banks']],
  cardSettings:    [['settings', 'card']],
  companyInfo:     [['settings', 'company']],
  taxSettings:     [['settings', 'tax']],
  purchases:       [['purchases']],
  printers:        [['printers']],
  labelDesigns:    [['labelDesigns']],
};

if (typeof window !== 'undefined') {
  window.addEventListener('ls-change', (e: Event) => {
    const key = (e as CustomEvent<string>).detail;
    const queryKeys = KEY_MAP[key];
    if (queryKeys) {
      queryKeys.forEach(qk => queryClient.invalidateQueries({ queryKey: qk }));
    }
  });
}
