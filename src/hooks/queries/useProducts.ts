// Hook de productos — usa la nueva arquitectura (Repository + Service + React Query).
// Reemplaza useInventory() en las páginas migradas.
// Las páginas no migradas siguen usando useInventory() sin problemas.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inventoryService } from '@/infrastructure/container';
import type { Product, Category } from '@/types/product';
import type { Supplier } from '@/types/supplier';
import type { CreateProductInput } from '@/domain/inventory';

// ─── QUERY KEYS ──────────────────────────────────────────────────────────────
export const productKeys = {
  all: ['products'] as const,
  byId: (id: string) => ['products', id] as const,
  lowStock: ['products', 'lowStock'] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
};

export const supplierKeys = {
  all: ['suppliers'] as const,
};

// ─── PRODUCTS HOOK ────────────────────────────────────────────────────────────
export function useProducts() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: productKeys.all,
    queryFn: () => inventoryService.getAllProducts(),
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateProductInput) => inventoryService.addProduct(data),
    onSuccess: (newProduct) => {
      // Insertar en caché inmediatamente sin esperar re-fetch
      qc.setQueryData<Product[]>(productKeys.all, (old) => [newProduct, ...(old ?? [])]);
      // Re-fetch en segundo plano para sincronizar con el servidor
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Artículo creado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      inventoryService.updateProduct(id, updates),
    onSuccess: (updatedProduct) => {
      qc.setQueryData<Product[]>(productKeys.all, (old) =>
        (old ?? []).map(p => p.id === updatedProduct.id ? updatedProduct : p)
      );
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Artículo actualizado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteProduct(id),
    onSuccess: (_, id) => {
      qc.setQueryData<Product[]>(productKeys.all, (old) =>
        (old ?? []).filter(p => p.id !== id)
      );
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success('Artículo eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock, reserved }: { id: string; stock: number; reserved?: number }) =>
      inventoryService.updateStock(id, stock, reserved),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    // Estado
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Mutaciones
    addProduct: addMutation.mutate,
    addProductAsync: addMutation.mutateAsync,
    updateProduct: (id: string, updates: Partial<Product>) =>
      updateMutation.mutate({ id, updates }),
    deleteProduct: deleteMutation.mutate,
    updateStock: (id: string, stock: number, reserved?: number) =>
      updateStockMutation.mutate({ id, stock, reserved }),

    // Utilidades (síncronas sobre los datos ya cargados)
    findByBarcode: (barcode: string) =>
      query.data?.find(p => p.barcode === barcode) ?? null,
    findByReference: (ref: string) =>
      query.data?.find(p => p.reference === ref) ?? null,
    getLowStockProducts: () =>
      (query.data ?? []).filter(p => p.stock > 0 && p.stock <= p.minStock),
    getProductsByCategory: (categoryId: string) =>
      (query.data ?? []).filter(p => p.categoryId === categoryId),
  };
}

// ─── CATEGORIES HOOK ─────────────────────────────────────────────────────────
export function useCategories() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => inventoryService.getAllCategories(),
  });

  const addMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      inventoryService.addCategory(name, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success('Categoría creada correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name: string; description: string }) =>
      inventoryService.updateCategory(id, name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success('Categoría eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    addCategory: (name: string, description: string) =>
      addMutation.mutate({ name, description }),
    updateCategory: (id: string, name: string, description: string) =>
      updateMutation.mutate({ id, name, description }),
    deleteCategory: deleteMutation.mutate,
  };
}

// ─── SUPPLIERS HOOK ──────────────────────────────────────────────────────────
export function useSuppliers() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: supplierKeys.all,
    queryFn: () => inventoryService.getAllSuppliers(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Supplier, 'id' | 'createdAt' | 'code'>) =>
      inventoryService.addSupplier(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success('Proveedor creado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Supplier> }) =>
      inventoryService.updateSupplier(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteSupplier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success('Proveedor eliminado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    suppliers: query.data ?? [],
    isLoading: query.isLoading,
    addSupplier: addMutation.mutate,
    updateSupplier: (id: string, updates: Partial<Supplier>) =>
      updateMutation.mutate({ id, updates }),
    deleteSupplier: deleteMutation.mutate,
  };
}
