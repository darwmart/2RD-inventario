import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { downloadPurchasesTemplate, parsePurchasesFile, type PurchaseImportInvoice } from '@/utils/importExcel';
import { usePurchasesData } from '@/hooks/queries/usePurchasesData';
import { useProducts, useSuppliers } from '@/hooks/queries/useProducts';
import type { CreateDocumentInput } from '@/domain/purchases';
import type { PurchaseItem } from '@/types/purchase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'idle' | 'preview' | 'importing' | 'done';

export default function ImportPurchasesDialog({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [invoices, setInvoices] = useState<PurchaseImportInvoice[]>([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const { createDocumentAsync } = usePurchasesData();
  const { products } = useProducts();
  const { suppliers } = useSuppliers();

  const reset = () => {
    setStep('idle');
    setInvoices([]);
    setProgress(0);
    setErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parsePurchasesFile(file);
      if (!parsed.length) { toast.error('El archivo no contiene facturas válidas'); return; }
      setInvoices(parsed);
      setStep('preview');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al leer el archivo');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    const errs: string[] = [];

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      try {
        const supplier = suppliers.find(s => s.code === inv.supplierCode);
        if (!supplier) {
          errs.push(`Factura ${i + 1}: Proveedor con código "${inv.supplierCode}" no encontrado — omitida`);
          setProgress(i + 1);
          continue;
        }

        const items: PurchaseItem[] = [];
        for (const line of inv.items) {
          const product = products.find(
            p => p.reference === line.productRef || p.barcode === line.productRef,
          );
          if (!product) {
            if (line.productName) {
              // Register the line with the provided name (product may not exist in DB yet)
              items.push({
                productId:   line.productRef,
                productName: line.productName,
                quantity:    line.quantity,
                unitCost:    line.unitCost,
                total:       line.quantity * line.unitCost,
              });
            } else {
              errs.push(`Factura ${i + 1}: Producto "${line.productRef}" no encontrado — línea omitida`);
            }
            continue;
          }
          items.push({
            productId:   product.id,
            productName: product.name,
            quantity:    line.quantity,
            unitCost:    line.unitCost,
            total:       line.quantity * line.unitCost,
          });
        }

        if (!items.length) {
          errs.push(`Factura ${i + 1}: Sin artículos válidos — omitida`);
          setProgress(i + 1);
          continue;
        }

        const supplierName = (
          supplier.commercialName ||
          supplier.fiscalName ||
          ''
        ).trim();

        const input: CreateDocumentInput = {
          documentType:           'invoice',
          supplierId:             supplier.id,
          supplierName,
          supplierInvoiceNumber:  inv.invoiceNumber || undefined,
          warehouse:              inv.warehouse || undefined,
          items,
          tax:                    inv.tax || 0,
          notes:                  inv.notes || undefined,
        };

        await createDocumentAsync(input);
      } catch (err: unknown) {
        errs.push(`Factura ${i + 1}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
      setProgress(i + 1);
    }

    setErrors(errs);
    setStep('done');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const totalItems = invoices.reduce((s, inv) => s + inv.items.length, 0);
  const skipped = errors.filter(e => e.includes('omitida')).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar facturas de compra desde Excel</DialogTitle>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-blue-800">Paso 1 — Descarga la plantilla</p>
              <p className="text-xs text-blue-600">
                Llena la plantilla con tus facturas y luego súbela aquí.
                Los proveedores deben existir previamente en el sistema.
              </p>
              <Button variant="outline" size="sm" onClick={downloadPurchasesTemplate} className="gap-1.5">
                <Download className="h-4 w-4" /> Descargar plantilla
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Paso 2 — Sube el archivo</p>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Haz clic para seleccionar el archivo</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx o .xls</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>{invoices.length}</strong> factura(s) con <strong>{totalItems}</strong> línea(s) listas para importar
              </span>
            </div>
            <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600">Proveedor</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600">N° Factura</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">Líneas</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv, i) => {
                    const subtotal = inv.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-2 py-1 max-w-[130px] truncate">
                          {inv.supplierName || `Cód: ${inv.supplierCode}`}
                        </td>
                        <td className="px-2 py-1 font-mono text-gray-600">{inv.invoiceNumber || '—'}</td>
                        <td className="px-2 py-1 text-right">{inv.items.length}</td>
                        <td className="px-2 py-1 text-right">${subtotal.toLocaleString('es-CO')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              Las facturas se registran como "Pendientes de pago". El proveedor debe existir en el sistema.
            </p>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
              <p className="text-sm text-gray-700">
                Importando {progress} de {invoices.length} factura(s)...
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${invoices.length ? (progress / invoices.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                Importación completada:{' '}
                <strong>{invoices.length - skipped}</strong> de {invoices.length} factura(s) importadas
              </span>
            </div>
            {errors.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-0.5">
                <p className="text-xs font-medium text-amber-800 flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.length} advertencia(s):
                </p>
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'idle' && (
            <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={reset}>Volver</Button>
              <Button onClick={handleImport}>
                Importar {invoices.length} factura(s)
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
