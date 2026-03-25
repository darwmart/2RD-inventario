import { sampleProducts, sampleCategories } from '@/data/sample-products';
import { v4 as uuidv4 } from 'uuid';
import { Product, Category } from '@/types';

export const importSampleData = () => {
  try {
    // Obtener datos existentes
    const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
    const existingCategories = JSON.parse(localStorage.getItem('categories') || '[]');

    // Crear mapa de categorías existentes por nombre
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((cat: Category) => {
      categoryMap.set(cat.name, cat.id);
    });

    // Crear categorías faltantes
    const categoriesToAdd: Category[] = [];
    sampleCategories.forEach(catName => {
      if (!categoryMap.has(catName)) {
        const newCategoryId = uuidv4();
        const newCategory: Category = {
          id: newCategoryId,
          name: catName,
          description: `Categoría ${catName}`,
          createdAt: new Date()
        };
        categoriesToAdd.push(newCategory);
        categoryMap.set(catName, newCategoryId);
      }
    });

    // Guardar categorías
    const allCategories = [...existingCategories, ...categoriesToAdd];
    localStorage.setItem('categories', JSON.stringify(allCategories));

    // Crear productos
    const productsToAdd: Product[] = sampleProducts.map(prod => {
      const categoryId = categoryMap.get(prod.categoryName) || '';

      // Calcular precios adicionales basados en currentPrice
      const currentPrice = prod.currentPrice;
      const suggestedPrice = Math.round(currentPrice * 1.15); // 15% más
      const discountPrice = Math.round(currentPrice * 0.90); // 10% menos
      const wholesalePrice = Math.round(currentPrice * 0.85); // 15% menos

      return {
        id: uuidv4(),
        reference: prod.reference,
        barcode: prod.barcode,
        name: prod.name,
        description: `${prod.name} - Producto de calidad`,
        image: '', // Sin imagen por defecto
        cost: prod.cost,
        currentPrice: currentPrice,
        suggestedPrice: suggestedPrice,
        discountPrice: discountPrice,
        wholesalePrice: wholesalePrice,
        stock: prod.stock,
        minStock: 5,
        reservedStock: 0,
        hasIva: true, // Por defecto con IVA
        categoryId: categoryId,
        supplierId: '', // Sin proveedor asignado
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    // Guardar productos
    const allProducts = [...existingProducts, ...productsToAdd];
    localStorage.setItem('products', JSON.stringify(allProducts));

    return {
      success: true,
      message: `Importación exitosa: ${categoriesToAdd.length} categorías y ${productsToAdd.length} productos agregados`,
      categoriesAdded: categoriesToAdd.length,
      productsAdded: productsToAdd.length
    };

  } catch (error) {
    console.error('Error al importar datos de prueba:', error);
    return {
      success: false,
      message: `Error: ${error}`,
      categoriesAdded: 0,
      productsAdded: 0
    };
  }
};

// Función para limpiar todos los datos
export const clearAllData = () => {
  if (confirm('¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
    localStorage.removeItem('products');
    localStorage.removeItem('categories');
    localStorage.removeItem('suppliers');
    localStorage.removeItem('sales');
    localStorage.removeItem('advisors');
    localStorage.removeItem('purchases');

    return {
      success: true,
      message: 'Todos los datos han sido eliminados'
    };
  }

  return {
    success: false,
    message: 'Operación cancelada'
  };
};

// Hacer disponible en consola del navegador para pruebas
if (typeof window !== 'undefined') {
  (window as any).importSampleData = importSampleData;
  (window as any).clearAllData = clearAllData;
}
