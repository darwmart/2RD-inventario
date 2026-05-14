import { describe, it, expect } from 'vitest';
import {
  createProduct,
  applyProductUpdate,
  applyStockUpdate,
  createCategory,
  createSupplier,
  type CreateProductInput,
} from '@/domain/inventory';
import type { Product, Supplier } from '@/types';

// ─── Fixture de producto base ─────────────────────────────────────────────────

const baseInput: CreateProductInput = {
  name: 'Casco MTB Pro',
  barcode: '5901234123457',
  reference: 'CSC-001',
  description: 'Casco para montaña',
  image: '',
  cost: 80000,
  suggestedPrice: 120000,
  discountPrice: 110000,
  wholesalePrice: 100000,
  currentPrice: 120000,
  stock: 10,
  minStock: 2,
  hasIva: false,
  categoryId: 'cat-1',
  supplierId: 'sup-1',
};

// ─── createProduct ────────────────────────────────────────────────────────────

describe('createProduct', () => {
  it('asigna un id no vacío', () => {
    const p = createProduct(baseInput);
    expect(p.id).toBeTruthy();
    expect(p.id.length).toBeGreaterThan(0);
  });

  it('inicializa reservedStock en 0', () => {
    expect(createProduct(baseInput).reservedStock).toBe(0);
  });

  it('asigna createdAt y updatedAt como Date', () => {
    const p = createProduct(baseInput);
    expect(p.createdAt).toBeInstanceOf(Date);
    expect(p.updatedAt).toBeInstanceOf(Date);
  });

  it('preserva todos los campos de entrada', () => {
    const p = createProduct(baseInput);
    expect(p.name).toBe(baseInput.name);
    expect(p.cost).toBe(baseInput.cost);
    expect(p.currentPrice).toBe(baseInput.currentPrice);
    expect(p.stock).toBe(baseInput.stock);
  });

  it('dos productos creados tienen ids distintos', () => {
    const p1 = createProduct(baseInput);
    const p2 = createProduct(baseInput);
    expect(p1.id).not.toBe(p2.id);
  });
});

// ─── applyProductUpdate ───────────────────────────────────────────────────────

describe('applyProductUpdate', () => {
  const products: Product[] = [
    createProduct({ ...baseInput, name: 'Producto A' }),
    createProduct({ ...baseInput, name: 'Producto B' }),
  ];

  it('actualiza solo el producto con el id indicado', () => {
    const updated = applyProductUpdate(products, products[0].id, { name: 'Producto A Editado' });
    expect(updated[0].name).toBe('Producto A Editado');
    expect(updated[1].name).toBe('Producto B');
  });

  it('no modifica el arreglo original (inmutabilidad)', () => {
    applyProductUpdate(products, products[0].id, { name: 'No Cambia' });
    expect(products[0].name).toBe('Producto A');
  });

  it('actualiza updatedAt al aplicar cambios', () => {
    const before = products[0].updatedAt;
    const updated = applyProductUpdate(products, products[0].id, { cost: 99000 });
    expect(updated[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('retorna el mismo arreglo con igual longitud', () => {
    const updated = applyProductUpdate(products, products[0].id, { stock: 20 });
    expect(updated).toHaveLength(products.length);
  });

  it('no cambia nada si el id no existe', () => {
    const updated = applyProductUpdate(products, 'id-inexistente', { name: 'Ghost' });
    expect(updated[0].name).toBe('Producto A');
    expect(updated[1].name).toBe('Producto B');
  });
});

// ─── applyStockUpdate ─────────────────────────────────────────────────────────

describe('applyStockUpdate', () => {
  const products: Product[] = [
    createProduct({ ...baseInput, name: 'Moto A' }),
    createProduct({ ...baseInput, name: 'Moto B' }),
  ];

  it('actualiza el stock del producto correcto', () => {
    const updated = applyStockUpdate(products, products[0].id, 50);
    expect(updated[0].stock).toBe(50);
  });

  it('no modifica el stock de los otros productos', () => {
    const updated = applyStockUpdate(products, products[0].id, 50);
    expect(updated[1].stock).toBe(baseInput.stock);
  });

  it('actualiza reservedStock si se proporciona', () => {
    const updated = applyStockUpdate(products, products[0].id, 50, 5);
    expect(updated[0].reservedStock).toBe(5);
  });

  it('conserva reservedStock existente si no se proporciona', () => {
    const updated = applyStockUpdate(products, products[0].id, 50);
    expect(updated[0].reservedStock).toBe(0);
  });

  it('permite stock en 0 (agotado)', () => {
    const updated = applyStockUpdate(products, products[0].id, 0);
    expect(updated[0].stock).toBe(0);
  });
});

// ─── createCategory ───────────────────────────────────────────────────────────

describe('createCategory', () => {
  it('asigna nombre y descripción correctamente', () => {
    const cat = createCategory('Cascos', 'Cascos y protección');
    expect(cat.name).toBe('Cascos');
    expect(cat.description).toBe('Cascos y protección');
  });

  it('genera un id no vacío', () => {
    const cat = createCategory('Guantes', '');
    expect(cat.id).toBeTruthy();
  });

  it('asigna createdAt como Date', () => {
    expect(createCategory('Test', '').createdAt).toBeInstanceOf(Date);
  });

  it('dos categorías tienen ids distintos', () => {
    const c1 = createCategory('Cat A', '');
    const c2 = createCategory('Cat B', '');
    expect(c1.id).not.toBe(c2.id);
  });
});

// ─── createSupplier ───────────────────────────────────────────────────────────

const baseSupplierData: Omit<Supplier, 'id' | 'createdAt'> = {
  code: '',
  taxIdType: 'NIT',
  taxId: '900123456-1',
  fiscalName: 'Proveedor S.A.',
  commercialName: 'Proveedor',
  address: 'Calle 1 # 2-3',
  phone: '3001234567',
  email: 'prov@prov.com',
  mobile: '',
  city: 'Bogotá',
  country: 'Colombia',
  isActive: true,
  paymentTerms: 'Contado',
};

describe('createSupplier', () => {
  it('asigna código "1" para el primer proveedor en lista vacía', () => {
    const s = createSupplier([], baseSupplierData);
    expect(s.code).toBe('1');
  });

  it('auto-incrementa el código respecto al mayor existente', () => {
    const existing = [
      createSupplier([], baseSupplierData),   // code = '1'
      { ...baseSupplierData, id: 'x', createdAt: new Date(), code: '3' },
    ];
    const s = createSupplier(existing, baseSupplierData);
    expect(s.code).toBe('4');
  });

  it('genera id no vacío', () => {
    const s = createSupplier([], baseSupplierData);
    expect(s.id).toBeTruthy();
  });

  it('asigna createdAt como Date', () => {
    const s = createSupplier([], baseSupplierData);
    expect(s.createdAt).toBeInstanceOf(Date);
  });

  it('preserva los datos del proveedor', () => {
    const s = createSupplier([], baseSupplierData);
    expect(s.fiscalName).toBe(baseSupplierData.fiscalName);
    expect(s.taxId).toBe(baseSupplierData.taxId);
  });
});
