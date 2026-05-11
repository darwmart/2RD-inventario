// Punto de entrada unificado — re-exporta todos los tipos por dominio.
// Todo el código existente que importe desde '@/types' sigue funcionando sin cambios.
// El código nuevo debe importar desde el archivo específico (ej: '@/types/product').
export * from './shared';
export * from './product';
export * from './sale';
export * from './customer';
export * from './supplier';
export * from './purchase';
export * from './accounting';
export * from './settings';
export * from './warehouse';
