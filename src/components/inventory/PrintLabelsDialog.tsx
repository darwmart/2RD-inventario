import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Printer, Search } from 'lucide-react';
import { Product, LabelDesign, LabelField } from '@/types';
import { toast } from 'sonner';
import { ean13Bars } from '@/utils/barcode';

interface Category {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  products: Product[];
  categories: Category[];
  labelDesigns: LabelDesign[];
  initialProductId?: string;
  onClose: () => void;
}

export default function PrintLabelsDialog({ open, products, categories, labelDesigns, initialProductId, onClose }: Props) {
  const [printDesignId, setPrintDesignId] = useState('');
  const [printItems, setPrintItems] = useState<{ productId: string; qty: number }[]>([]);
  const [printSearch, setPrintSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setPrintItems(initialProductId ? [{ productId: initialProductId, qty: 1 }] : []);
    const defaultDesign = labelDesigns.find(d => d.documentType === 'Etiquetas de artículos') || labelDesigns[0];
    setPrintDesignId(defaultDesign?.id || '');
    setPrintSearch('');
  }, [open, initialProductId, labelDesigns]);

  const togglePrintItem = (productId: string, checked: boolean) => {
    if (checked) {
      setPrintItems(prev => prev.some(i => i.productId === productId)
        ? prev : [...prev, { productId, qty: 1 }]);
    } else {
      setPrintItems(prev => prev.filter(i => i.productId !== productId));
    }
  };

  const updatePrintQty = (productId: string, qty: number) => {
    setPrintItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i));
  };

  const generatePrintHtml = (design: LabelDesign, items: { product: Product; qty: number }[]): string => {
    const lw = parseFloat(design.labelWidth.replace(',', '.')) || 75;
    const lh = parseFloat(design.labelHeight.replace(',', '.')) || 25;
    const cols = parseInt(design.labelsPerRow) || 3;
    const topM = parseFloat(design.topMargin.replace(',', '.')) || 12;
    const leftM = parseFloat(design.leftMargin.replace(',', '.')) || 5.6;
    const hGap = parseFloat(design.horizontalSpacing.replace(',', '.')) || 1;
    const vGap = parseFloat(design.verticalSpacing.replace(',', '.')) || 2;
    const fields: LabelField[] = design.fields || [];

    const labelHtml = (p: Product): string => {
      const fieldsHtml = fields.filter(f => f.visible).map(f => {
        const baseStyle = `position:absolute;left:${f.x}mm;top:${f.y}mm;width:${f.width}mm;height:${f.height}mm;`
          + `font-size:${f.fontSize}pt;font-weight:${f.bold ? 'bold' : 'normal'};`
          + `font-style:${f.italic ? 'italic' : 'normal'};`
          + `text-decoration:${f.underline ? 'underline' : 'none'};`
          + `text-align:${f.align};overflow:hidden;`;

        if (f.key === 'ean-barras') {
          const bits = ean13Bars(p.barcode);
          if (!bits) {
            return `<div style="${baseStyle}display:flex;align-items:center;justify-content:center;">
              <span style="font-size:5pt;font-family:monospace">${p.barcode || 'Sin EAN'}</span></div>`;
          }
          const bh = f.height * 0.72;
          const mw = f.width / 95;
          let rects = '';
          for (let i = 0; i < bits.length; i++) {
            if (bits[i] === '1') {
              rects += `<rect x="${(i * mw).toFixed(4)}" y="0" width="${(mw + 0.01).toFixed(4)}" height="${bh.toFixed(3)}" fill="black"/>`;
            }
          }
          const fs = Math.max(f.height * 0.2, 1.5);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f.width}mm" height="${f.height}mm" viewBox="0 0 ${f.width} ${f.height}">`
            + rects
            + `<text x="${(f.width / 2).toFixed(2)}" y="${(bh + fs * 1.1).toFixed(2)}" text-anchor="middle" font-family="monospace" font-size="${fs.toFixed(2)}">${p.barcode}</text>`
            + `</svg>`;
          return `<div style="${baseStyle}">${svg}</div>`;
        }

        let content = '';
        if (f.key === 'nombre') content = p.name;
        else if (f.key === 'referencia' || f.key === 'codigo') content = p.reference;
        else if (f.key === 'ean-texto') content = p.barcode || '';
        else if (f.key === 'precio1') content = `$${p.currentPrice.toLocaleString('es-CO')}`;
        else if (f.key === 'precio2') content = `$${p.suggestedPrice.toLocaleString('es-CO')}`;
        else if (f.key === 'precio3') content = `$${p.discountPrice.toLocaleString('es-CO')}`;
        else if (f.key === 'precio4') content = `$${p.wholesalePrice.toLocaleString('es-CO')}`;
        else if (f.key === 'categoria') content = categories.find(c => c.id === p.categoryId)?.name || '';
        else if (f.key === 'stock') content = String(p.stock);

        return `<div style="${baseStyle}display:flex;align-items:center;padding:0 0.3mm;">${content}</div>`;
      }).join('');
      return `<div style="position:relative;width:${lw}mm;height:${lh}mm;overflow:hidden;">${fieldsHtml}</div>`;
    };

    const allLabels: Product[] = [];
    items.forEach(({ product, qty }) => { for (let i = 0; i < qty; i++) allLabels.push(product); });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas</title>
<style>
  @page { size: A4 portrait; margin: ${topM}mm ${leftM}mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, ${lw}mm); column-gap: ${hGap}mm; row-gap: ${vGap}mm; }
</style></head><body>
<div class="grid">${allLabels.map(labelHtml).join('')}</div>
</body></html>`;
  };

  const handlePrint = () => {
    const design = labelDesigns.find(d => d.id === printDesignId);
    if (!design) { toast.error('Selecciona un diseño de etiqueta'); return; }
    const items = printItems.filter(i => i.qty > 0).map(i => ({
      product: products.find(p => p.id === i.productId)!,
      qty: i.qty,
    })).filter(i => !!i.product);
    if (!items.length) { toast.error('Selecciona al menos un artículo'); return; }
    const html = generatePrintHtml(design, items);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
  };

  const filteredProducts = products.filter(p => {
    if (!printSearch) return true;
    const s = printSearch.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.reference.toLowerCase().includes(s) || p.barcode.includes(printSearch);
  });

  const totalLabels = printItems.reduce((s, i) => s + i.qty, 0);
  const design = labelDesigns.find(d => d.id === printDesignId);
  const previewProduct = printItems.length > 0 ? products.find(p => p.id === printItems[0].productId) : null;

  const renderPreview = () => {
    if (!design) return <p className="text-xs text-gray-400 text-center">Selecciona un diseño de etiqueta</p>;
    const lw = parseFloat(design.labelWidth.replace(',', '.')) || 75;
    const lh = parseFloat(design.labelHeight.replace(',', '.')) || 25;
    const sc = Math.min(230 / lw, 200 / lh, 10);
    const fields: LabelField[] = design.fields || [];

    const getFieldValue = (key: string, p: Product | null | undefined): string => {
      if (!p) return key === 'nombre' ? 'Nombre artículo' : key === 'referencia' ? 'REF-001' : '—';
      if (key === 'nombre') return p.name;
      if (key === 'referencia' || key === 'codigo') return p.reference;
      if (key === 'ean-texto') return p.barcode || '';
      if (key === 'precio1') return `$${p.currentPrice.toLocaleString('es-CO')}`;
      if (key === 'precio2') return `$${p.suggestedPrice.toLocaleString('es-CO')}`;
      if (key === 'precio3') return `$${p.discountPrice.toLocaleString('es-CO')}`;
      if (key === 'precio4') return `$${p.wholesalePrice.toLocaleString('es-CO')}`;
      if (key === 'categoria') return categories.find(c => c.id === p?.categoryId)?.name || '';
      if (key === 'stock') return String(p.stock);
      return '';
    };

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative bg-white shadow" style={{ width: lw * sc, height: lh * sc, border: '1.5px solid #444' }}>
          {fields.filter(f => f.visible).map(f => (
            <div key={f.key} className="absolute overflow-hidden" style={{
              left: f.x * sc, top: f.y * sc, width: f.width * sc, height: f.height * sc,
              fontSize: Math.max(f.fontSize * sc / 6, 5),
              fontWeight: f.bold ? 'bold' : 'normal',
              fontStyle: f.italic ? 'italic' : 'normal',
              textDecoration: f.underline ? 'underline' : 'none',
              textAlign: f.align,
              display: 'flex', alignItems: 'center', padding: '0 1px',
            }}>
              {f.key === 'ean-barras' ? (
                <svg width="100%" height="100%">
                  {previewProduct?.barcode && ean13Bars(previewProduct.barcode) ? (
                    ean13Bars(previewProduct.barcode).split('').map((bit, i, arr) =>
                      bit === '1' ? (
                        <rect key={i}
                          x={`${(i / arr.length * 100).toFixed(2)}%`}
                          y="0" width={`${(1 / arr.length * 100).toFixed(2)}%`} height="75%"
                          fill="black" />
                      ) : null
                    )
                  ) : (
                    [0, 4, 7, 11, 14, 18, 21, 26, 29, 33].map((x, i) => (
                      <rect key={i} x={`${(x / 85 * 100).toFixed(1)}%`} width="1.5%" height="75%" fill="black" />
                    ))
                  )}
                  <text x="50%" y="92%" textAnchor="middle"
                    fontSize={Math.max(f.fontSize * sc / 8, 4)} fontFamily="monospace">
                    {previewProduct?.barcode || '0000000000000'}
                  </text>
                </svg>
              ) : (
                <span className="truncate w-full">{getFieldValue(f.key, previewProduct)}</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">{lw}×{lh}mm</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[950px] w-[95vw] p-0 flex flex-col" style={{ height: '85vh', maxHeight: '85vh' }}>
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" />Imprimir Etiquetas
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-2 border-b bg-gray-50 shrink-0 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600 whitespace-nowrap">Diseño de etiqueta:</Label>
            <Select value={printDesignId} onValueChange={setPrintDesignId}>
              <SelectTrigger className="h-7 text-xs w-64">
                <SelectValue placeholder="Selecciona un diseño..." />
              </SelectTrigger>
              <SelectContent>
                {labelDesigns.map(d => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    [{d.code}] {d.name} — {d.labelWidth}×{d.labelHeight}mm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {design && (
            <span className="text-xs text-gray-500">
              {design.labelWidth}×{design.labelHeight}mm · {design.labelsPerRow}×{design.labelsPerColumn} por hoja
            </span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input className="pl-7 h-7 text-xs" placeholder="Buscar artículo..."
                  value={printSearch} onChange={e => setPrintSearch(e.target.value)} />
              </div>
            </div>
            <div className="px-3 py-1 border-b flex gap-2 bg-gray-50">
              <button className="text-xs text-blue-600 hover:underline" onClick={() => {
                setPrintItems(prev => {
                  const next = [...prev];
                  filteredProducts.forEach(p => {
                    if (!next.some(i => i.productId === p.id)) next.push({ productId: p.id, qty: 1 });
                  });
                  return next;
                });
              }}>Seleccionar todos</button>
              <span className="text-gray-300">|</span>
              <button className="text-xs text-red-500 hover:underline" onClick={() => setPrintItems([])}>
                Limpiar selección
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b">
                  <tr>
                    <th className="w-8 px-2 py-1"></th>
                    <th className="text-left px-2 py-1 font-medium text-gray-600">Artículo</th>
                    <th className="text-left px-2 py-1 font-medium text-gray-600 w-24">Ref / EAN</th>
                    <th className="text-right px-2 py-1 font-medium text-gray-600 w-20">Precio</th>
                    <th className="text-center px-2 py-1 font-medium text-gray-600 w-16">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(p => {
                    const item = printItems.find(i => i.productId === p.id);
                    const isChecked = !!item;
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 cursor-pointer ${isChecked ? 'bg-blue-50' : ''}`}
                        onClick={() => togglePrintItem(p.id, !isChecked)}>
                        <td className="px-2 py-1">
                          <Checkbox checked={isChecked}
                            onCheckedChange={v => togglePrintItem(p.id, !!v)}
                            onClick={e => e.stopPropagation()} />
                        </td>
                        <td className="px-2 py-1 font-medium max-w-[200px]">
                          <p className="truncate">{p.name}</p>
                        </td>
                        <td className="px-2 py-1 font-mono text-gray-500">
                          <p className="truncate">{p.reference}</p>
                          {p.barcode && <p className="text-[10px] text-gray-400 truncate">{p.barcode}</p>}
                        </td>
                        <td className="px-2 py-1 text-right text-gray-700">
                          ${p.currentPrice.toLocaleString('es-CO')}
                        </td>
                        <td className="px-2 py-1 text-center" onClick={e => e.stopPropagation()}>
                          {isChecked ? (
                            <Input type="number" min="1" max="999"
                              className="h-6 w-14 text-xs text-center px-1"
                              value={item.qty}
                              onChange={e => updatePrintQty(p.id, parseInt(e.target.value) || 1)} />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-500 flex gap-4">
              <span>{printItems.length} artículo{printItems.length !== 1 ? 's' : ''} seleccionado{printItems.length !== 1 ? 's' : ''}</span>
              <span>Total etiquetas: <strong>{totalLabels}</strong></span>
            </div>
          </div>

          <div className="w-72 shrink-0 flex flex-col bg-gray-100">
            <div className="px-3 py-2 border-b bg-white">
              <p className="text-xs font-medium text-gray-700">Vista previa</p>
              <p className="text-[10px] text-gray-400">
                {previewProduct?.name || 'Selecciona un artículo'}
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              {renderPreview()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t px-4 py-3 shrink-0 bg-gray-50">
          <p className="text-xs text-gray-500">
            Total: <strong>{totalLabels}</strong> etiqueta{totalLabels !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
