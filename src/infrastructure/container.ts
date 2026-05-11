// Contenedor de Inyección de Dependencias — único lugar donde se decide
// qué implementación usa cada repositorio.
//
// PARA MIGRAR UN MÓDULO A SUPABASE:
// 1. Importa la implementación Supabase correspondiente
// 2. Reemplaza la instancia aquí
// 3. Nada más en la app necesita cambiar

import {
  LocalStorageProductRepository,
  LocalStorageCategoryRepository,
  LocalStorageSupplierRepository,
  LocalStorageSaleRepository,
  LocalStorageCustomerRepository,
  LocalStorageAdvisorRepository,
  LocalStoragePaymentMethodRepository,
  LocalStorageExpenseRepository,
  LocalStorageBankRepository,
  LocalStorageSettingsRepository,
} from '@/repositories/localStorage';

import { InventoryService }  from '@/services/inventoryService';
import { SalesService }      from '@/services/salesService';
import { CustomerService }   from '@/services/customerService';
import { ExpenseService }    from '@/services/expenseService';
import { BankService }       from '@/services/bankService';
import { SettingsService }   from '@/services/settingsService';

// ─── REPOSITORIOS (singletons) ────────────────────────────────────────────────
const productRepository       = new LocalStorageProductRepository();
const categoryRepository      = new LocalStorageCategoryRepository();
const supplierRepository      = new LocalStorageSupplierRepository();
const saleRepository          = new LocalStorageSaleRepository();
const customerRepository      = new LocalStorageCustomerRepository();
const advisorRepository       = new LocalStorageAdvisorRepository();
const paymentMethodRepository = new LocalStoragePaymentMethodRepository();
const expenseRepository       = new LocalStorageExpenseRepository();
const bankRepository          = new LocalStorageBankRepository();
const settingsRepository      = new LocalStorageSettingsRepository();

// ─── SERVICIOS (singletons) ───────────────────────────────────────────────────
export const inventoryService = new InventoryService(
  productRepository, categoryRepository, supplierRepository,
);
export const salesService     = new SalesService(saleRepository, productRepository);
export const customerService  = new CustomerService(customerRepository);
export const expenseService   = new ExpenseService(expenseRepository);
export const bankService      = new BankService(bankRepository);
export const settingsService  = new SettingsService(settingsRepository);

// Acceso directo a repositorios para hooks que no necesitan lógica de negocio
export const repositories = {
  products:       productRepository,
  categories:     categoryRepository,
  suppliers:      supplierRepository,
  sales:          saleRepository,
  customers:      customerRepository,
  advisors:       advisorRepository,
  paymentMethods: paymentMethodRepository,
  expenses:       expenseRepository,
  banks:          bankRepository,
  settings:       settingsRepository,
};
