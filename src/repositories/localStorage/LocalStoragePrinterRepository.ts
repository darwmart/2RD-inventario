import type { Printer } from '@/types/settings';
import type { IPrinterRepository, CreatePrinterInput } from '../interfaces/IPrinterRepository';
import { LocalStorageRepository } from './base';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_PRINTERS: Printer[] = [
  {
    id: 'send-to-onenote',
    name: 'Send To OneNote 2016',
    type: 'network',
    isActive: true,
    isDefault: true,
    paperSize: 'A4',
    createdAt: new Date(),
  },
  {
    id: 'microsoft-pdf',
    name: 'Microsoft Print to PDF',
    type: 'network',
    isActive: true,
    isDefault: false,
    paperSize: 'A4',
    createdAt: new Date(),
  },
];

export class LocalStoragePrinterRepository
  extends LocalStorageRepository<Printer>
  implements IPrinterRepository
{
  constructor() {
    super('printers');
  }

  protected read(): Printer[] {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return DEFAULT_PRINTERS;
    try { return JSON.parse(raw) as Printer[]; } catch { return DEFAULT_PRINTERS; }
  }

  async create(data: CreatePrinterInput): Promise<Printer> {
    const printer: Printer = { ...data, id: uuidv4(), createdAt: new Date() };
    this.write([...this.read(), printer]);
    return printer;
  }

  async update(id: string, data: Partial<Printer>): Promise<Printer> {
    const updated = this.read().map(p => p.id === id ? { ...p, ...data } : p);
    this.write(updated);
    const result = updated.find(p => p.id === id);
    if (!result) throw new Error(`Impresora ${id} no encontrada`);
    return result;
  }

  async findDefault(): Promise<Printer | null> {
    return this.read().find(p => p.isDefault) ?? null;
  }

  async setDefault(id: string): Promise<void> {
    this.write(this.read().map(p => ({ ...p, isDefault: p.id === id })));
  }
}
