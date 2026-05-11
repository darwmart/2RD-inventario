// Clase base para todos los repositorios de localStorage.
// Lee y escribe directamente — sin hooks de React (clases puras).
// Los valores devueltos preservan el comportamiento del código existente:
// los Dates se serializan como strings en JSON y se recuperan como strings.
// Usa `new Date(entity.createdAt)` en la capa de presentación cuando necesites comparar.

export abstract class LocalStorageRepository<T extends { id: string }> {
  constructor(protected readonly storageKey: string) {}

  protected read(): T[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  protected write(items: T[]): void {
    window.localStorage.setItem(this.storageKey, JSON.stringify(items));
    // Notifica a React Query para que invalide las queries de esta clave.
    // El QueryClient lo escucha a través de un storage event sintético.
    window.dispatchEvent(new CustomEvent('ls-change', { detail: this.storageKey }));
  }

  async findAll(): Promise<T[]> {
    return this.read();
  }

  async findById(id: string): Promise<T | null> {
    return this.read().find(item => item.id === id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter(item => item.id !== id));
  }
}
