import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, X, Camera, Upload, ZoomIn, ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Product, WarehouseTransactionItem, WarehouseTransactionType } from '@/types';

export type WarehouseStockMap = Record<string, { quantity: number; productName: string; barcode?: string; reference?: string }>;

export interface TransactionItemRow extends WarehouseTransactionItem {
  key: string;
}

interface Props {
  open: boolean;
  txType: WarehouseTransactionType;
  warehouseName: string;
  warehouseStock: WarehouseStockMap;
  products: Product[];
  preloadedInItems?: TransactionItemRow[];
  onClose: () => void;
  onSubmit: (items: TransactionItemRow[], inItems: TransactionItemRow[], notes: string, images: string[]) => void;
}

// ── ImageCapture ─────────────────────────────────────────────────────────────
function ImageCapture({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Debe ser una imagen'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Máximo 8MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => onChange([...images, reader.result as string]);
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    setCameraOpen(true); setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setCameraReady(true); };
      }
    } catch { toast.error('No se pudo acceder a la cámara.'); setCameraOpen(false); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setCameraOpen(false); setCameraReady(false);
  };

  const takeSnapshot = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    onChange([...images, canvas.toDataURL('image/jpeg', 0.92)]);
    toast.success('Foto capturada'); stopCamera();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        <Button type="button" size="sm" variant="outline" onClick={openCamera}><Camera className="h-4 w-4 mr-1" /> Tomar foto</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Subir imagen</Button>
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {images.map((src, idx) => (
            <div key={idx} className="relative group">
              <img src={src} alt={`evidencia-${idx + 1}`} className="h-20 w-20 object-cover rounded border cursor-pointer" onClick={() => setPreview(src)} />
              <button type="button" onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-2.5 w-2.5" />
              </button>
              <button type="button" onClick={() => setPreview(src)}
                className="absolute inset-0 bg-black/20 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-4 flex flex-col gap-3 w-[90vw] max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cámara</h3>
              <button onClick={stopCamera}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!cameraReady && <div className="absolute inset-0 flex items-center justify-center text-white text-sm">Iniciando cámara...</div>}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={stopCamera}>Cancelar</Button>
              <Button onClick={takeSnapshot} disabled={!cameraReady} className="bg-blue-600 hover:bg-blue-700 px-8">
                <Camera className="h-4 w-4 mr-2" /> Capturar
              </Button>
            </div>
          </div>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setPreview(null)}>
          <img src={preview} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreview(null)}><X className="h-7 w-7" /></button>
        </div>
      )}
    </div>
  );
}

// ── ItemRows ──────────────────────────────────────────────────────────────────
function ItemRows({ items, maxQtyFn, onChange, onRemove, allowNegative = false }: {
  items: TransactionItemRow[];
  maxQtyFn: (productId: string) => number;
  onChange: (productId: string, field: string, value: string | number) => void;
  onRemove: (productId: string) => void;
  allowNegative?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {items.map(item => {
        const isExpanded = expanded[item.productId] ?? false;
        const hasVariants = item.color || item.brand || item.size;
        return (
          <div key={item.productId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">{item.productName}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Input type="number" min={allowNegative ? -9999 : 1} max={maxQtyFn(item.productId)} value={item.quantity}
                  onChange={e => onChange(item.productId, 'quantity', Number(e.target.value))}
                  className="h-7 w-20 text-right text-sm" />
                <button type="button"
                  onClick={() => setExpanded(p => ({ ...p, [item.productId]: !isExpanded }))}
                  className={`h-7 px-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${hasVariants ? 'border-purple-300 text-purple-600 bg-purple-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} C/M/T
                </button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => onRemove(item.productId)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div className="px-3 pb-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-2 bg-gray-50">
                {(['color', 'brand', 'size'] as const).map(f => (
                  <div key={f}>
                    <Label className="text-xs text-gray-500 mb-1 block">{f === 'color' ? 'Color' : f === 'brand' ? 'Marca' : 'Talla'}</Label>
                    <Input className="h-7 text-sm" placeholder={f === 'color' ? 'Ej: Rojo' : f === 'brand' ? 'Ej: Nike' : 'Ej: M / 42'}
                      value={(item as any)[f] || ''} onChange={e => onChange(item.productId, f, e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── TransactionDialog ─────────────────────────────────────────────────────────
export default function TransactionDialog({ open, txType, warehouseName, warehouseStock, products, preloadedInItems, onClose, onSubmit }: Props) {
  const [txItems, setTxItems] = useState<TransactionItemRow[]>([]);
  const [txInItems, setTxInItems] = useState<TransactionItemRow[]>([]);
  const [txNotes, setTxNotes] = useState('');
  const [txImages, setTxImages] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchIn, setProductSearchIn] = useState('');

  useEffect(() => {
    if (!open) return;
    setTxItems([]); setTxNotes(''); setTxImages(''); setProductSearch(''); setProductSearchIn('');
    setTxInItems(preloadedInItems ?? []);
    setTxImages([]);
  }, [open, preloadedInItems]);

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || p.barcode.includes(q);
  });

  const makeItemRow = (productId: string, direction?: 'out' | 'in'): TransactionItemRow => {
    const p = products.find(pr => pr.id === productId)!;
    return { key: productId + (direction ?? ''), productId, productName: p.name, barcode: p.barcode, reference: p.reference, quantity: 1, color: '', brand: '', size: '', direction };
  };

  const addItemToTx = (productId: string) => {
    if (txItems.some(i => i.productId === productId)) { toast.error('Ya está en la lista'); return; }
    setTxItems(prev => [...prev, makeItemRow(productId)]); setProductSearch('');
  };

  const addItemToTxIn = (productId: string) => {
    if (txInItems.some(i => i.productId === productId)) { toast.error('Ya está en la lista'); return; }
    setTxInItems(prev => [...prev, makeItemRow(productId, 'in')]); setProductSearchIn('');
  };

  const updateItem = (setter: typeof setTxItems, productId: string, field: string, value: string | number) =>
    setter(prev => prev.map(i => i.productId === productId ? { ...i, [field]: value } : i));

  const handleSubmit = () => {
    const allOut = txType === 'exchange' ? txItems.map(i => ({ ...i, direction: 'out' as const })) : txItems;
    const allIn = txType === 'exchange' ? txInItems : [];
    if (allOut.length === 0 && allIn.length === 0) { toast.error('Agrega al menos un producto'); return; }
    if ([...allOut, ...allIn].some(i => i.quantity <= 0)) { toast.error('Las cantidades deben ser mayores a 0'); return; }
    onSubmit(txItems, txInItems, txNotes, txImages);
  };

  const titleMap: Record<WarehouseTransactionType, string> = {
    loan: 'Nuevo Préstamo', return: 'Devolución de Productos',
    adjustment: 'Ajuste de Inventario', exchange: 'Cambio de Artículo',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleMap[txType]}{warehouseName && ` — ${warehouseName}`}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* CAMBIO: paso 1 — artículo prestado que SALE de la bodega */}
          {txType === 'exchange' && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 flex flex-col gap-3">
              <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                1. Artículo PRESTADO que SALE de la bodega
                <span className="text-xs font-normal text-orange-600">(selecciona el que fue prestado)</span>
              </p>
              {Object.keys(warehouseStock).length === 0 ? (
                <p className="text-sm text-gray-400 bg-white rounded p-3 border border-gray-200">No hay artículos prestados en esta bodega</p>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9 bg-white" placeholder="Filtrar artículos en bodega..."
                      value={productSearchIn} onChange={e => setProductSearchIn(e.target.value)} />
                  </div>
                  <div className="border border-orange-200 rounded-md max-h-40 overflow-y-auto bg-white">
                    {Object.entries(warehouseStock)
                      .filter(([, info]) => !productSearchIn || info.productName.toLowerCase().includes(productSearchIn.toLowerCase()) || (info.reference ?? '').toLowerCase().includes(productSearchIn.toLowerCase()))
                      .map(([productId, info]) => {
                        const added = txInItems.some(i => i.productId === productId);
                        return (
                          <button key={productId} disabled={added}
                            className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors ${added ? 'bg-orange-50 text-orange-700 cursor-default opacity-70' : 'hover:bg-orange-50 cursor-pointer'}`}
                            onClick={() => { if (!added) { addItemToTxIn(productId); setProductSearchIn(''); } }}>
                            <span className="font-medium">{info.productName}{info.reference && <span className="text-gray-400 text-xs ml-1">({info.reference})</span>}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${added ? 'bg-orange-200 text-orange-800' : 'bg-orange-100 text-orange-700'}`}>
                              {added ? '✓ Seleccionado' : `${info.quantity} en bodega`}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
              <ItemRows items={txInItems} maxQtyFn={id => warehouseStock[id]?.quantity ?? 999}
                onChange={(id, f, v) => updateItem(setTxInItems, id, f, v)}
                onRemove={id => setTxInItems(prev => prev.filter(i => i.productId !== id))} />
            </div>
          )}

          {/* Préstamo / Ajuste / CAMBIO paso 2 */}
          {(txType === 'loan' || txType === 'adjustment' || txType === 'exchange') && (
            <div className={`rounded-lg border p-3 flex flex-col gap-3 ${txType === 'exchange' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              {txType === 'exchange' && (
                <div>
                  <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4" />
                    2. Artículo de REEMPLAZO que ENTRA al inventario
                  </p>
                  <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 mt-1">
                    Este artículo viene de otra bodega ajena — se registra como <strong>nuevo ingreso</strong> al inventario. No descuenta stock existente.
                  </p>
                </div>
              )}
              <div>
                {txType !== 'exchange' && <Label className="mb-1 block">Buscar producto</Label>}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-9 bg-white" placeholder="Nombre, referencia o código de barras..."
                    value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                </div>
                {productSearch && (
                  <div className="mt-1 border border-gray-200 rounded-md shadow-sm max-h-36 overflow-y-auto bg-white">
                    {filteredProducts.length === 0 ? <p className="text-sm text-gray-400 p-3">Sin resultados</p>
                      : filteredProducts.slice(0, 10).map(p => (
                        <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between border-b border-gray-100 last:border-0"
                          onClick={() => addItemToTx(p.id)}>
                          <span>{p.name} <span className="text-gray-400 text-xs">({p.reference})</span></span>
                          <span className="text-gray-500 text-xs">Stock: {p.stock}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <ItemRows items={txItems}
                maxQtyFn={id => (txType === 'loan' || txType === 'exchange') ? (products.find(p => p.id === id)?.stock ?? 999) : 9999}
                onChange={(id, f, v) => updateItem(setTxItems, id, f, v)}
                onRemove={id => setTxItems(prev => prev.filter(i => i.productId !== id))}
                allowNegative={txType === 'adjustment'} />
              {txType === 'adjustment' && <p className="text-xs text-gray-500">Positivo = añadir al inventario · Negativo = descontar</p>}
            </div>
          )}

          {/* Devolución */}
          {txType === 'return' && (
            <div className="flex flex-col gap-3">
              <Label>Productos en bodega — seleccionar para devolver</Label>
              {Object.keys(warehouseStock).length === 0 ? (
                <p className="text-sm text-gray-400">No hay productos en esta bodega</p>
              ) : (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  {Object.entries(warehouseStock).map(([productId, info]) => {
                    const added = txItems.some(i => i.productId === productId);
                    return (
                      <button key={productId} disabled={added}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between disabled:opacity-40 border-b border-gray-100 last:border-0"
                        onClick={() => {
                          if (!added) setTxItems(prev => [...prev, { key: productId, productId, productName: info.productName, barcode: info.barcode, reference: info.reference, quantity: 1, color: '', brand: '', size: '' }]);
                        }}>
                        <span>{info.productName} <span className="text-gray-400 text-xs">({info.reference})</span></span>
                        <span className="text-orange-600 text-xs font-medium">{info.quantity} en bodega</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <ItemRows items={txItems} maxQtyFn={id => warehouseStock[id]?.quantity ?? 999}
                onChange={(id, f, v) => updateItem(setTxItems, id, f, v)}
                onRemove={id => setTxItems(prev => prev.filter(i => i.productId !== id))} />
            </div>
          )}

          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <ImageIcon className="h-4 w-4 text-gray-500" />
              Evidencia fotográfica <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </Label>
            <ImageCapture images={txImages} onChange={setTxImages} />
          </div>

          <div>
            <Label>Notas / Motivo</Label>
            <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="Descripción del movimiento..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}
            disabled={txItems.length === 0 && txInItems.length === 0}
            className={txType === 'loan' ? 'bg-orange-600 hover:bg-orange-700' : txType === 'return' ? 'bg-green-600 hover:bg-green-700' : txType === 'exchange' ? 'bg-purple-600 hover:bg-purple-700' : ''}>
            {txType === 'loan' && 'Registrar Préstamo'}
            {txType === 'return' && 'Registrar Devolución'}
            {txType === 'adjustment' && 'Registrar Ajuste'}
            {txType === 'exchange' && 'Registrar Cambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
