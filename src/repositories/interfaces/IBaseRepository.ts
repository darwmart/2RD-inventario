// Contrato base para todas las entidades persistibles.
// Todas las operaciones son async para ser compatibles con Supabase, REST, etc.
export interface IBaseRepository<T, TCreate = Omit<T, 'id' | 'createdAt'>> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: TCreate): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
