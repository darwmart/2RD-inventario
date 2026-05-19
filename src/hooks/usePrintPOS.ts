import { useLabelDesigns } from './queries';
import { parseTitillaConfig } from '@/types';
import { printPOSInvoice } from '@/utils/printUtils';
import type { Sale, CompanyInfo, LabelDesign } from '@/types';

const TYPE_MAP: Record<string, string> = {
  sale:     'Titilla POS',
  quote:    'Tirilla Cotizaciones',
  reserved: 'Tirilla Separados',
};

function resolveDesign(designs: LabelDesign[], saleType: Sale['type']): LabelDesign | undefined {
  const preferred = TYPE_MAP[saleType];
  const candidates = designs.filter(d => d.documentType === preferred);
  const active = candidates.find(d => d.isDefault) ?? candidates[0];
  if (active) return active;
  // fallback a Titilla POS
  const fallbacks = designs.filter(d => d.documentType === 'Titilla POS');
  return fallbacks.find(d => d.isDefault) ?? fallbacks[0];
}

export function usePrintPOS() {
  const { labelDesigns } = useLabelDesigns();

  return (sale: Sale, companyInfo: CompanyInfo) => {
    const design = resolveDesign(labelDesigns, sale.type);
    const config = design
      ? { ...parseTitillaConfig(design.description ?? '{}'), printerName: design.printerName }
      : undefined;
    printPOSInvoice(sale, companyInfo, config);
  };
}
