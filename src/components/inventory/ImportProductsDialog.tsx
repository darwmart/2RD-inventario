import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { downloadProductsTemplate, parseProductsFile, type ProductImportRow } from '@/utils/importExcel';
import { useProducts, useCategories, useSuppliers } from '@/hooks/queries/useProducts';
import type { CreateProductInput } from '@/domain/inventory';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'idle' | 'preview' | 'importing' | 'done';

export default function ImportProductsDialog({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const { addProductAsync, products } = useProducts();
  const { categories } = useCategories();
  const { suppliers } = useSuppliers();

  const reset = () => {
    setStep('idle');
    setRows([]);
    setProgress(0);
    setErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseProductsFile(file);
      if (!parsed.length) { toast.error('El archivo no contiene artículos válidos'); return; }
      setRows(parsed);
      setStep('preview');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al leer el archivo');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    const errs: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (products.find(p => p.reference === row.reference)) {
          errs.push(`Fila ${i + 2}: Referencia "${row.reference}" ya existe — omitida`);
          setProgress(i + 1);
          continue;
        }

        let categoryId = '';
        if (row.categoryName) {
          const cat = categories.find(c => c.name.toLowerCase() === row.categoryName.toLowerCase());
          if (cat) categoryId = cat.id;
        }

        let supplierId = '';
        if (row.supplierCode) {
          const sup = suppliers.find(s => s.code === row.supplierCode);
          if (sup) supplierId = sup.id;
        }

        const input: CreateProductInput = {
          reference:      row.reference,
          name:           row.name,
          barcode:        row.barcode || '',
          description:    row.description || '',
          image:          '',
          cost:           row.cost,
          suggestedPrice: row.suggestedPrice,
          discountPrice:  row.discountPrice || row.suggestedPrice,
          wholesalePrice: row.wholesalePrice || row.suggestedPrice,
          currentPrice:   row.currentPrice || row.suggestedPrice,
          stock:          row.stock || 0,
          minStock:       row.minStock || 0,
          hasIva:         row.hasIva,
          categoryId,
          supplierId,
        };

        await addProductAsync(input);
      } catch (err: unknown) {
        errs.push(`Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar artículos desde Excel</DialogTitle>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-blue-800">Paso 1 — Descarga la plantilla</p>
              <p className="text-xs text-blue-600">Llena la plantilla con tus artículos y luego súbela aquí.</p>
              <Button variant="outline" size="sm" onClick={downloadProductsTemplate} className="gap-1.5">
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
              <span>Se encontraron <strong>{rows.length}</strong> artículo(s) listos para importar</span>
            </div>
            <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600">Referencia</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600">Nombre</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">Costo</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">P.Sugerido</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1 font-mono">{r.reference}</td>
                      <td className="px-2 py-1 max-w-[140px] truncate">{r.name}</td>
                      <td className="px-2 py-1 text-right">{r.cost.toLocaleString('es-CO')}</td>
                      <td className="px-2 py-1 text-right">{r.suggestedPrice.toLocaleString('es-CO')}</td>
                      <td className="px-2 py-1 text-right">{r.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">Los artículos con referencia duplicada serán omitidos automáticamente.</p>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
              <p className="text-sm text-gray-700">
                Importando {progress} de {rows.length} artículo(s)...
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${rows.length ? (progress / rows.length) * 100 : 0}%` }}
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
                <strong>{rows.length - errors.filter(e => e.includes('omitida')).length}</strong> de {rows.length} artículo(s) creados
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
          {(step === 'idle') && (
            <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={reset}>Volver</Button>
              <Button onClick={handleImport}>
                Importar {rows.length} artículo(s)
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
