import { useState, useCallback } from 'react';
import { Product, Category, Supplier } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

export function useInventory() {
  const [products, setProducts] = useLocalStorage<Product[]>('products', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', [
    { id: '1', name: 'Electrónicos', description: 'Productos electrónicos', createdAt: new Date() },
    { id: '2', name: 'Ropa', description: 'Prendas de vestir', createdAt: new Date() },
    { id: '3', name: 'Hogar', description: 'Artículos para el hogar', createdAt: new Date() }
  ]);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', []);

  const addProduct = useCallback((productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  }, [setProducts]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(product => 
      product.id === id 
        ? { ...product, ...updates, updatedAt: new Date() }
        : product
    ));
  }, [setProducts]);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  }, [setProducts]);

  const updateStock = useCallback((productId: string, newStock: number) => {
    setProducts(prev => prev.map(product =>
      product.id === productId
        ? { ...product, stock: newStock, updatedAt: new Date() }
        : product
    ));
  }, [setProducts]);

  const findProductByBarcode = useCallback((barcode: string) => {
    return products.find(product => product.barcode === barcode);
  }, [products]);

  const findProductByReference = useCallback((reference: string) => {
    return products.find(product => 
      product.reference.toLowerCase().includes(reference.toLowerCase()) ||
      product.name.toLowerCase().includes(reference.toLowerCase())
    );
  }, [products]);

  const getLowStockProducts = useCallback(() => {
    return products.filter(product => product.stock <= product.minStock);
  }, [products]);

  const getProductsByCategory = useCallback((categoryId: string) => {
    return products.filter(product => product.categoryId === categoryId);
  }, [products]);

  const getProductsBySupplier = useCallback((supplierId: string) => {
    return products.filter(product => product.supplierId === supplierId);
  }, [products]);

  const addCategory = useCallback((name: string, description: string) => {
    const newCategory: Category = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date()
    };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, [setCategories]);

  const addSupplier = useCallback((supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: uuidv4(),
      createdAt: new Date()
    };
    setSuppliers(prev => [...prev, newSupplier]);
    return newSupplier;
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
    addSupplier
  };
}