// ─── Feature Flags ────────────────────────────────────────────
// Toggles centralizados. Leer desde import.meta.env para que Vite
// los elimine en build (dead-code elimination en producción).
// Patrón: VITE_FF_<FEATURE> = 'true' | 'false'

interface FeatureFlags {
  // Infraestructura
  enableSupabase: boolean;

  // Funcionalidades
  enableRealtime: boolean;       // Supabase Realtime para stock y ventas
  enableOffline: boolean;        // PWA + IndexedDB (trabajo offline)
  enableAudit: boolean;          // Sistema de auditoría enterprise
  enableSoftDelete: boolean;     // Soft delete en lugar de DELETE físico
  enableStockRPC: boolean;       // RPCs transaccionales para stock
  enableRBAC: boolean;           // Sistema de roles granular

  // UI/UX
  enableGlobalSearch: boolean;   // Búsqueda CMD+K
  enableKeyboardShortcuts: boolean; // Atajos F1, F2, F4...
  enableDashboardV2: boolean;    // Dashboard con KPIs desde Supabase
  enableExperimentalUI: boolean; // Componentes en prueba

  // Exportación y reportes
  enablePDFExport: boolean;
  enableExcelExport: boolean;
  enableBarcodeGeneration: boolean;
  enableThermalPrinting: boolean;
}

export const FEATURES: FeatureFlags = {
  enableSupabase:
    Boolean(import.meta.env.VITE_SUPABASE_URL?.startsWith('https')),

  enableRealtime:
    import.meta.env.VITE_FF_REALTIME === 'true',

  enableOffline:
    import.meta.env.VITE_FF_OFFLINE === 'true',

  enableAudit:
    import.meta.env.VITE_FF_AUDIT !== 'false', // habilitado por defecto

  enableSoftDelete:
    import.meta.env.VITE_FF_SOFT_DELETE !== 'false',

  enableStockRPC:
    import.meta.env.VITE_FF_STOCK_RPC !== 'false',

  enableRBAC:
    import.meta.env.VITE_FF_RBAC !== 'false',

  enableGlobalSearch:
    import.meta.env.VITE_FF_GLOBAL_SEARCH !== 'false',

  enableKeyboardShortcuts:
    import.meta.env.VITE_FF_KEYBOARD !== 'false',

  enableDashboardV2:
    import.meta.env.VITE_FF_DASHBOARD_V2 === 'true',

  enableExperimentalUI:
    import.meta.env.VITE_FF_EXPERIMENTAL === 'true',

  enablePDFExport:
    import.meta.env.VITE_FF_PDF !== 'false',

  enableExcelExport:
    import.meta.env.VITE_FF_EXCEL !== 'false',

  enableBarcodeGeneration:
    import.meta.env.VITE_FF_BARCODE !== 'false',

  enableThermalPrinting:
    import.meta.env.VITE_FF_THERMAL !== 'false',
};

// ─── Hook conveniente ─────────────────────────────────────────
export function useFeature(flag: keyof FeatureFlags): boolean {
  return FEATURES[flag];
}
