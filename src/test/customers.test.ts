import { describe, it, expect } from 'vitest';
import { Customer } from '@/types';

// ─── Lógica pura de clientes (sin hooks) ─────────────────────────────────────

function filterCustomers(customers: Partial<Customer>[], query: string) {
  const q = query.toLowerCase();
  return customers.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.document || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q)
  );
}

function getTotalSpent(sales: { total: number; customerId?: string }[], customerId: string) {
  return sales
    .filter(s => s.customerId === customerId)
    .reduce((sum, s) => sum + s.total, 0);
}

// ─── Tests módulo Clientes ────────────────────────────────────────────────────

describe('Módulo Clientes — búsqueda', () => {

  const customers = [
    { id: '1', name: 'Carlos Pérez', document: '123456789', phone: '3001234567' },
    { id: '2', name: 'Ana Gómez', document: '987654321', phone: '3109876543' },
    { id: '3', name: 'Luis Martínez', document: '555000111', phone: '3201112233' },
  ];

  it('Encuentra cliente por nombre', () => {
    expect(filterCustomers(customers, 'carlos')).toHaveLength(1);
    expect(filterCustomers(customers, 'carlos')[0].name).toBe('Carlos Pérez');
  });

  it('Encuentra cliente por documento', () => {
    expect(filterCustomers(customers, '987654321')).toHaveLength(1);
  });

  it('Encuentra cliente por teléfono', () => {
    expect(filterCustomers(customers, '3201112233')).toHaveLength(1);
  });

  it('Retorna múltiples resultados para término general', () => {
    // 'ez' está en Pérez y Martínez (también en Gómez)
    expect(filterCustomers(customers, 'ez').length).toBeGreaterThan(1);
  });

  it('Retorna vacío si no hay coincidencia', () => {
    expect(filterCustomers(customers, 'zzznoencontrado')).toHaveLength(0);
  });

  it('Búsqueda vacía retorna todos los clientes', () => {
    expect(filterCustomers(customers, '')).toHaveLength(3);
  });
});

describe('Módulo Clientes — historial de compras', () => {

  const sales = [
    { total: 150000, customerId: 'c1' },
    { total: 80000, customerId: 'c1' },
    { total: 200000, customerId: 'c2' },
  ];

  it('Calcula total gastado por cliente correctamente', () => {
    expect(getTotalSpent(sales, 'c1')).toBe(230000);
    expect(getTotalSpent(sales, 'c2')).toBe(200000);
  });

  it('Retorna 0 para cliente sin compras', () => {
    expect(getTotalSpent(sales, 'c99')).toBe(0);
  });

  it('Cuenta el número de compras por cliente', () => {
    const count = sales.filter(s => s.customerId === 'c1').length;
    expect(count).toBe(2);
  });
});
