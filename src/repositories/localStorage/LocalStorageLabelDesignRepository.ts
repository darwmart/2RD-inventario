import type { LabelDesign } from '@/types/settings';
import type { ILabelDesignRepository, CreateLabelDesignInput } from '../interfaces/ILabelDesignRepository';
import { LocalStorageRepository } from './base';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_DESIGNS: LabelDesign[] = [
  {
    id: '1',
    code: '2',
    name: 'Copia de Cód. Barras',
    description: '',
    documentType: 'Etiquetas de artículos',
    printerName: 'Send To OneNote 2016',
    labelWidth: '75,00',
    labelHeight: '25,00',
    labelsPerRow: '3',
    labelsPerColumn: '9',
    topMargin: '12,00',
    leftMargin: '5,60',
    horizontalSpacing: '1,00',
    verticalSpacing: '2,00',
    createdAt: new Date(),
  },
];

export class LocalStorageLabelDesignRepository
  extends LocalStorageRepository<LabelDesign>
  implements ILabelDesignRepository
{
  constructor() {
    super('labelDesigns');
  }

  protected read(): LabelDesign[] {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return DEFAULT_DESIGNS;
    try { return JSON.parse(raw) as LabelDesign[]; } catch { return DEFAULT_DESIGNS; }
  }

  async create(data: CreateLabelDesignInput): Promise<LabelDesign> {
    const design: LabelDesign = { ...data, id: uuidv4(), createdAt: new Date() };
    this.write([...this.read(), design]);
    return design;
  }

  async update(id: string, data: Partial<LabelDesign>): Promise<LabelDesign> {
    const updated = this.read().map(d => d.id === id ? { ...d, ...data } : d);
    this.write(updated);
    const result = updated.find(d => d.id === id);
    if (!result) throw new Error(`Diseño ${id} no encontrado`);
    return result;
  }

  async findByDocumentType(type: string): Promise<LabelDesign[]> {
    return this.read().filter(d => d.documentType === type);
  }
}
