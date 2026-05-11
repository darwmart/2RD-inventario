import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // localStorage es síncrono — datos siempre frescos en < 1 tick
      staleTime: 0,
      // En producción con Supabase, cambiar a 5 * 60 * 1000 (5 min)
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Escucha cambios de localStorage emitidos por los repositorios.
// Esto permite que las queries se invaliden automáticamente cuando
// algún repositorio escribe datos nuevos.
if (typeof window !== 'undefined') {
  window.addEventListener('ls-change', (e: Event) => {
    const key = (e as CustomEvent<string>).detail;
    // Mapa de claves localStorage → query keys de React Query
    const keyMap: Record<string, string[]> = {
      products: ['products'],
      categories: ['categories'],
      suppliers: ['suppliers'],
      sales: ['sales'],
      customers: ['customers'],
    };
    const queryKeys = keyMap[key];
    if (queryKeys) {
      queryKeys.forEach(qk => queryClient.invalidateQueries({ queryKey: [qk] }));
    }
  });
}
