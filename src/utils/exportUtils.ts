import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { Sale, Product, Category, Supplier } from '@/types';

// Extender el tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

export const exportSalesToExcel = (
  sales: Sale[],
  startDate?: string,
  endDate?: string,
  advisor?: string,
  reference?: string
) => {
  const filteredSales = sales.filter(sale => {
    let includeDate = true;
    let includeAdvisor = true;
    let includeReference = true;

    if (startDate) {
      const saleDate = new Date(sale.createdAt).toDateString();
      const start = new Date(startDate).toDateString();
      includeDate = saleDate >= start;
    }

    if (endDate && includeDate) {
      const saleDate = new Date(sale.createdAt).toDateString();
      const end = new Date(endDate).toDateString();
      includeDate = saleDate <= end;
    }

    if (advisor) {
      includeAdvisor = sale.advisorId === advisor || sale.advisorName.toLowerCase().includes(advisor.toLowerCase());
    }

    if (reference) {
      includeReference = sale.reference?.toLowerCase().includes(reference.toLowerCase());
    }

    return includeDate && includeAdvisor && includeReference && sale.status === 'completed';
  });

  const data = filteredSales.map(sale => ({
    'N° Venta': sale.saleNumber,
    'Fecha': new Date(sale.createdAt).toLocaleDateString('es-CO'),
    'Hora': new Date(sale.createdAt).toLocaleTimeString('es-CO'),
    'Asesor': sale.advisorName,
    'Método Pago': sale.paymentMethod.name,
    'Tipo Pago': sale.paymentMethod.type === 'cash' ? 'Efectivo' : 
                 sale.paymentMethod.type === 'electronic' ? 'Electrónico' : 'Crédito',
    'Subtotal': sale.subtotal,
    'Descuento': sale.discount,
    'Total': sale.total,
    'Estado': sale.status === 'completed' ? 'Completada' : 
              sale.status === 'pending' ? 'Pendiente' : 'Cancelada',
    'Tipo': sale.type === 'sale' ? 'Venta' : 
            sale.type === 'quote' ? 'Cotización' : 'Separado'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

  const filename = `ventas_${startDate ? startDate + '_' : ''}${endDate ? endDate + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};

export const exportSalesToPDF = (
  sales: Sale[],
  startDate?: string,
  endDate?: string,
  advisor?: string,
  reference?: string
) => {
   const filteredSales = sales.filter(sale => {
    let includeDate = true;
    let includeAdvisor = true;
    let includeReference = true;

    if (startDate) {
      const saleDate = new Date(sale.createdAt).toDateString();
      const start = new Date(startDate).toDateString();
      includeDate = saleDate >= start;
    }

    if (endDate && includeDate) {
      const saleDate = new Date(sale.createdAt).toDateString();
      const end = new Date(endDate).toDateString();
      includeDate = saleDate <= end;
    }

    if (advisor) {
      includeAdvisor = sale.advisorId === advisor || sale.advisorName.toLowerCase().includes(advisor.toLowerCase());
    }

    if (reference) {
      includeReference = sale.reference?.toLowerCase().includes(reference.toLowerCase());
    }

    return includeDate && includeAdvisor && includeReference && sale.status === 'completed';
  });

  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Reporte de Ventas', 14, 22);
  
  // Filtros aplicados
  let yPos = 35;
  doc.setFontSize(12);
  if (startDate || endDate) {
    doc.text(`Período: ${startDate ? startDate : 'Inicio'} - ${endDate ? endDate : 'Actual'}`, 14, yPos);
    yPos += 7;
  }
  if (advisor) {
    doc.text(`Asesor: ${advisor}`, 14, yPos);
    yPos += 7;
  }
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, yPos);
  yPos += 10;

  // Resumen
  const totalVentas = filteredSales.length;
  const totalIngresos = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  
  doc.text(`Total de ventas: ${totalVentas}`, 14, yPos);
  yPos += 7;
  doc.text(`Ingresos totales: $${totalIngresos.toLocaleString('es-CO')}`, 14, yPos);
  yPos += 15;

  // Tabla de ventas
  const tableData = filteredSales.map(sale => [
    sale.saleNumber,
    new Date(sale.createdAt).toLocaleDateString('es-CO'),
    sale.advisorName,
    sale.paymentMethod.name,
    `$${sale.total.toLocaleString('es-CO')}`
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['N° Venta', 'Fecha', 'Asesor', 'Método Pago', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 }
  });

  const filename = `ventas_${startDate ? startDate + '_' : ''}${endDate ? endDate + '_' : ''}${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const exportInventoryToExcel = (
  products: Product[],
  categories: Category[],
  suppliers: Supplier[],
  categoryFilter?: string,
  lowStockOnly?: boolean
) => {
  const filteredProducts = products.filter(product => {
    let includeCategory = true;
    let includeStock = true;

    if (categoryFilter && categoryFilter !== 'all') {
      includeCategory = product.categoryId === categoryFilter;
    }

    if (lowStockOnly) {
      includeStock = product.stock <= product.minStock;
    }

    return includeCategory && includeStock;
  });

  const data = filteredProducts.map(product => {
    const category = categories.find(c => c.id === product.categoryId);
    const supplier = suppliers.find(s => s.id === product.supplierId);
    
    return {
      'Nombre': product.name,
      'Referencia': product.reference,
      'Código de Barras': product.barcode,
      'Categoría': category?.name || 'Sin categoría',
      'Proveedor': supplier?.name || 'Sin proveedor',
      'Stock Actual': product.stock,
      'Stock Mínimo': product.minStock,
      'Costo': product.cost,
      'Precio Sugerido': product.suggestedPrice,
      'Precio Descuento': product.discountPrice,
      'Precio Mayorista': product.wholesalePrice,
      'Precio Actual': product.currentPrice,
      'Descripción': product.description,
      'Imagen': product.image,
      'Fecha Creación': new Date(product.createdAt).toLocaleDateString('es-CO'),
      'Última Actualización': new Date(product.updatedAt).toLocaleDateString('es-CO')
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  // Hoja adicional con resumen por categorías
  const categoryStats = categories.map(category => {
    const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
    const totalProducts = categoryProducts.length;
    const totalStock = categoryProducts.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = categoryProducts.reduce((sum, p) => sum + (p.currentPrice * p.stock), 0);

    return {
      'Categoría': category.name,
      'Total Productos': totalProducts,
      'Stock Total': totalStock,
      'Valor Inventario': totalValue
    };
  });

  const wsCategories = XLSX.utils.json_to_sheet(categoryStats);
  XLSX.utils.book_append_sheet(wb, wsCategories, 'Resumen Categorías');

  const filename = `inventario_${categoryFilter && categoryFilter !== 'all' ? categoryFilter + '_' : ''}${lowStockOnly ? 'stock_bajo_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};

export const exportInventoryToPDF = (
  products: Product[],
  categories: Category[],
  suppliers: Supplier[],
  categoryFilter?: string,
  lowStockOnly?: boolean
) => {
  const filteredProducts = products.filter(product => {
    let includeCategory = true;
    let includeStock = true;

    if (categoryFilter && categoryFilter !== 'all') {
      includeCategory = product.categoryId === categoryFilter;
    }

    if (lowStockOnly) {
      includeStock = product.stock <= product.minStock;
    }

    return includeCategory && includeStock;
  });

  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Reporte de Inventario', 14, 22);
  
  // Filtros aplicados
  let yPos = 35;
  doc.setFontSize(12);
  if (categoryFilter && categoryFilter !== 'all') {
    const category = categories.find(c => c.id === categoryFilter);
    doc.text(`Categoría: ${category?.name || 'Desconocida'}`, 14, yPos);
    yPos += 7;
  }
  if (lowStockOnly) {
    doc.text('Filtro: Solo productos con stock bajo', 14, yPos);
    yPos += 7;
  }
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 14, yPos);
  yPos += 10;

  // Resumen
  const totalProducts = filteredProducts.length;
  const totalStock = filteredProducts.reduce((sum, product) => sum + product.stock, 0);
  const totalValue = filteredProducts.reduce((sum, product) => sum + (product.currentPrice * product.stock), 0);
  
  doc.text(`Total productos: ${totalProducts}`, 14, yPos);
  yPos += 7;
  doc.text(`Stock total: ${totalStock} unidades`, 14, yPos);
  yPos += 7;
  doc.text(`Valor total: $${totalValue.toLocaleString('es-CO')}`, 14, yPos);
  yPos += 15;

  // Tabla de productos
  const tableData = filteredProducts.map(product => {
    const category = categories.find(c => c.id === product.categoryId);
    return [
      product.name,
      product.reference,
      category?.name || 'N/A',
      product.stock,
      `$${product.currentPrice.toLocaleString('es-CO')}`
    ];
  });

  doc.autoTable({
    startY: yPos,
    head: [['Producto', 'Referencia', 'Categoría', 'Stock', 'Precio']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50] },
    styles: { fontSize: 8 }
  });

  const filename = `inventario_${categoryFilter && categoryFilter !== 'all' ? categoryFilter + '_' : ''}${lowStockOnly ? 'stock_bajo_' : ''}${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const exportBackup = (
  products: Product[],
  sales: Sale[],
  categories: Category[],
  suppliers: Supplier[],
  advisors: any[],
  paymentMethods: any[]
) => {
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {
      products,
      sales,
      categories,
      suppliers,
      advisors,
      paymentMethods
    }
  };

  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const filename = `backup_sistema_ventas_${new Date().toISOString().split('T')[0]}.json`;
  saveAs(dataBlob, filename);
};

export const importBackup = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const backup = JSON.parse(result);
        
        if (backup.data && backup.data.products && backup.data.sales) {
          resolve(backup.data);
        } else {
          reject(new Error('Formato de archivo de backup inválido'));
        }
      } catch (error) {
        reject(new Error('Error al leer el archivo de backup'));
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
};