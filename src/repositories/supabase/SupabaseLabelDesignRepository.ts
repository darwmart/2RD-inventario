import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import type { LabelDesign } from '@/types/settings';
import type { ILabelDesignRepository, CreateLabelDesignInput } from '../interfaces/ILabelDesignRepository';

type Row = Record<string, unknown>;

function toDesign(row: Row): LabelDesign {
  return {
    id:                row.id as string,
    code:              (row.code as string) ?? '',
    name:              row.name as string,
    description:       (row.description as string) ?? undefined,
    documentType:      (row.document_type as string) ?? '',
    printerName:       (row.printer_name as string) ?? '',
    labelWidth:        (row.label_width as string) ?? '0',
    labelHeight:       (row.label_height as string) ?? '0',
    labelsPerRow:      (row.labels_per_row as string) ?? '1',
    labelsPerColumn:   (row.labels_per_column as string) ?? '1',
    topMargin:         (row.top_margin as string) ?? '0',
    leftMargin:        (row.left_margin as string) ?? '0',
    horizontalSpacing: (row.horizontal_spacing as string) ?? '0',
    verticalSpacing:   (row.vertical_spacing as string) ?? '0',
    fields:            (row.fields as LabelDesign['fields']) ?? undefined,
    isDefault:         (row.is_default as boolean) ?? false,
    createdAt:         new Date(row.created_at as string),
  };
}

function toRow(data: Partial<LabelDesign> & Partial<CreateLabelDesignInput>): Row {
  const row: Row = {};
  if (data.id                !== undefined) row.id                 = data.id;
  if (data.code              !== undefined) row.code               = data.code;
  if (data.name              !== undefined) row.name               = data.name;
  if (data.description       !== undefined) row.description        = data.description;
  if (data.documentType      !== undefined) row.document_type      = data.documentType;
  if (data.printerName       !== undefined) row.printer_name       = data.printerName;
  if (data.labelWidth        !== undefined) row.label_width        = data.labelWidth;
  if (data.labelHeight       !== undefined) row.label_height       = data.labelHeight;
  if (data.labelsPerRow      !== undefined) row.labels_per_row     = data.labelsPerRow;
  if (data.labelsPerColumn   !== undefined) row.labels_per_column  = data.labelsPerColumn;
  if (data.topMargin         !== undefined) row.top_margin         = data.topMargin;
  if (data.leftMargin        !== undefined) row.left_margin        = data.leftMargin;
  if (data.horizontalSpacing !== undefined) row.horizontal_spacing = data.horizontalSpacing;
  if (data.verticalSpacing   !== undefined) row.vertical_spacing   = data.verticalSpacing;
  if (data.fields            !== undefined) row.fields             = data.fields;
  if (data.isDefault         !== undefined) row.is_default         = data.isDefault;
  return row;
}

export class SupabaseLabelDesignRepository implements ILabelDesignRepository {
  private readonly table = 'label_designs';

  async findAll(): Promise<LabelDesign[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toDesign);
  }

  async findById(id: string): Promise<LabelDesign | null> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDesign(data) : null;
  }

  async create(data: CreateLabelDesignInput): Promise<LabelDesign> {
    const row = toRow({ ...data, id: uuidv4() });
    const { data: inserted, error } = await supabase
      .from(this.table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return toDesign(inserted);
  }

  async update(id: string, data: Partial<LabelDesign>): Promise<LabelDesign> {
    const { data: updated, error } = await supabase
      .from(this.table).update(toRow(data)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return toDesign(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async findByDocumentType(type: string): Promise<LabelDesign[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('document_type', type).order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toDesign);
  }
}
