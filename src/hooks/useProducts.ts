// src/hooks/useProducts.ts
import { useState } from "react";

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([
    { id: "p1", name: "Producto A", price: 20000, stock: 50 },
    { id: "p2", name: "Producto B", price: 35000, stock: 30 },
    { id: "p3", name: "Producto C", price: 50000, stock: 20 },
  ]);

  const updateStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );
  };

  return { products, updateStock };
}
