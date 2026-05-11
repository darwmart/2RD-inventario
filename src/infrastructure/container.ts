// Contenedor de Inyección de Dependencias.
// Selecciona automáticamente la implementación correcta según el entorno:
// - Con VITE_SUPABASE_URL configurada → repositorios Supabase
// - Sin ella                          → repositorios localStorage (fallback)
//
// Para forzar un módulo específico a Supabase o localStorage,
// reemplaza su instancia directamente aquí.

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
  LocalStoragePurchaseRepository,
} from '@/repositories/localStorage';

import {
  SupabaseProductRepository,
  SupabaseCategoryRepository,
  SupabaseSupplierRepository,
  SupabaseSaleRepository,
  SupabaseCustomerRepository,
  SupabaseAdvisorRepository,
  SupabasePaymentMethodRepository,
  SupabaseExpenseRepository,
  SupabaseBankRepository,
  SupabaseSettingsRepository,
} from '@/repositories/supabase';

import { InventoryService }  from '@/services/inventoryService';
import { SalesService }      from '@/services/salesService';
import { CustomerService }   from '@/services/customerService';
import { ExpenseService }    from '@/services/expenseService';
import { BankService }       from '@/services/bankService';
import { SettingsService }   from '@/services/settingsService';
import { PurchasesService }  from '@/services/purchasesService';

// ─── SELECCIÓN DE IMPLEMENTACIÓN ──────────────────────────────────────────────

const USE_SUPABASE = Boolean(import.meta.env.VITE_SUPABASE_URL);

const productRepository = USE_SUPABASE
  ? new SupabaseProductRepository()
  : new LocalStorageProductRepository();

const categoryRepository = USE_SUPABASE
  ? new SupabaseCategoryRepository()
  : new LocalStorageCategoryRepository();

const supplierRepository = USE_SUPABASE
  ? new SupabaseSupplierRepository()
  : new LocalStorageSupplierRepository();

const saleRepository = USE_SUPABASE
  ? new SupabaseSaleRepository()
  : new LocalStorageSaleRepository();

const customerRepository = USE_SUPABASE
  ? new SupabaseCustomerRepository()
  : new LocalStorageCustomerRepository();

const advisorRepository = USE_SUPABASE
  ? new SupabaseAdvisorRepository()
  : new LocalStorageAdvisorRepository();

const paymentMethodRepository = USE_SUPABASE
  ? new SupabasePaymentMethodRepository()
  : new LocalStoragePaymentMethodRepository();

const expenseRepository = USE_SUPABASE
  ? new SupabaseExpenseRepository()
  : new LocalStorageExpenseRepository();

const bankRepository = USE_SUPABASE
  ? new SupabaseBankRepository()
  : new LocalStorageBankRepository();

const settingsRepository = USE_SUPABASE
  ? new SupabaseSettingsRepository()
  : new LocalStorageSettingsRepository();

// Compras — aún sin repositorio Supabase (usa localStorage siempre)
const purchaseRepository = new LocalStoragePurchaseRepository();

// ─── SERVICIOS (singletons) ───────────────────────────────────────────────────

export const inventoryService = new InventoryService(
  productRepository, categoryRepository, supplierRepository,
);
export const salesService    = new SalesService(saleRepository, productRepository);
export const customerService = new CustomerService(customerRepository);
export const expenseService  = new ExpenseService(expenseRepository);
export const bankService     = new BankService(bankRepository);
export const settingsService  = new SettingsService(settingsRepository);
export const purchasesService = new PurchasesService(purchaseRepository, productRepository, bankRepository);

// Acceso directo a repositorios para hooks sin lógica de negocio
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
