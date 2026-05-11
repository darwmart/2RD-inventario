import { useCallback } from 'react';
import { Product, Category, Supplier } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import {
  CreateProductInput,
  createProduct,
  applyProductUpdate,
  applyStockUpdate,
  createCategory,
  createSupplier,
} from '@/domain/inventory';

export function useInventory() {
  const [products, setProducts] = useLocalStorage<Product[]>('products', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', [
    { id: '1', name: 'Electrónicos', description: 'Productos electrónicos', createdAt: new Date() },
    { id: '2', name: 'Ropa', description: 'Prendas de vestir', createdAt: new Date() },
    { id: '3', name: 'Hogar', description: 'Artículos para el hogar', createdAt: new Date() }
  ]);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', []);

  const addProduct = useCallback((data: CreateProductInput) => {
    const product = createProduct(data);
    setProducts(prev => [...prev, product]);
    return product;
  }, [setProducts]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => applyProductUpdate(prev, id, updates));
  }, [setProducts]);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, [setProducts]);

  const updateStock = useCallback((productId: string, newStock: number, newReservedStock?: number) => {
    setProducts(prev => applyStockUpdate(prev, productId, newStock, newReservedStock));
  }, [setProducts]);

  const findProductByBarcode = useCallback((barcode: string) => {
    return products.find(p => p.barcode === barcode);
  }, [products]);

  const findProductByReference = useCallback((reference: string) => {
    return products.find(p =>
      p.reference.toLowerCase().includes(reference.toLowerCase()) ||
      p.name.toLowerCase().includes(reference.toLowerCase()),
    );
  }, [products]);

  const getLowStockProducts = useCallback(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  const getProductsByCategory = useCallback((categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId);
  }, [products]);

  const getProductsBySupplier = useCallback((supplierId: string) => {
    return products.filter(p => p.supplierId === supplierId);
  }, [products]);

  const addCategory = useCallback((name: string, description: string) => {
    const category = createCategory(name, description);
    setCategories(prev => [...prev, category]);
    return category;
  }, [setCategories]);

  const updateCategory = useCallback((id: string, name: string, description: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, description } : c));
  }, [setCategories]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, [setCategories]);

  const addSupplier = useCallback((data: Omit<Supplier, 'id' | 'createdAt'>) => {
    const supplier = createSupplier(suppliers, data);
    setSuppliers(prev => [...prev, supplier]);
    return supplier;
  }, [setSuppliers, suppliers]);

  const updateSupplier = useCallback((id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setSuppliers]);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, [setSuppliers]);

  return {
    products,
    categories,
    suppliers,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    findProductByBarcode,
    findProductByReference,
    getLowStockProducts,
    getProductsByCategory,
    getProductsBySupplier,
    addCategory,
    updateCategory,
    deleteCategory,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
