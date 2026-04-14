import { useState, useMemo, useRef } from 'react';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalWarehouse, WarehouseTransaction, WarehouseTransactionItem, WarehouseTransactionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Edit2, Trash2, ArrowDownToLine, ArrowUpFromLine, Warehouse,
  Package, History, Search, X, SlidersHorizontal, Camera, Upload,
  FileSpreadsheet, FileText, Image as ImageIcon, ZoomIn, ArrowLeftRight,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─── jsPDF type extension ──────────────────────────────────────────────────────
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WarehouseFormState {
  name: string;
  location: string;
  contact: string;
  phone: string;
  description: string;
}

interface TransactionItemRow extends WarehouseTransactionItem {
  key: string;
}

const emptyWarehouseForm: WarehouseFormState = {
  name: '', location: '', contact: '', phone: '', description: '',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(date: Date | string) {
  try {
    return new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(date);
  }
}

function formatDateShort(date: Date | string) {
  try {
    return new Date(date).toLocaleDateString('es-CO');
  } catch {
    return String(date);
  }
}

function typeBadge(type: WarehouseTransactionType) {
  if (type === 'loan') return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Préstamo</Badge>;
  if (type === 'return') return <Badge className="bg-green-100 text-green-700 border-green-200">Devolución</Badge>;
  if (type === 'exchange') return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Cambio</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ajuste</Badge>;
}

function typeLabel(type: WarehouseTransactionType) {
  if (type === 'loan') return 'Préstamo';
  if (type === 'return') return 'Devolución';
  if (type === 'exchange') return 'Cambio';
  return 'Ajuste';
}

function variantTags(item: WarehouseTransactionItem) {
  const tags: string[] = [];
  if (item.color) tags.push(`Color: ${item.color}`);
  if (item.brand) tags.push(`Marca: ${item.brand}`);
  if (item.size) tags.push(`Talla: ${item.size}`);
  return tags;
}

// ─── Image capture component ───────────────────────────────────────────────────
function ImageCapture({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
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
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch {
      toast.error('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onChange([...images, dataUrl]);
    toast.success('Foto capturada');
    stopCamera();
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        <Button type="button" size="sm" variant="outline" onClick={openCamera}>
          <Camera className="h-4 w-4 mr-1" /> Tomar foto
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> Subir imagen
        </Button>
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {images.map((src, idx) => (
            <div key={idx} className="relative group">
              <img src={src} alt={`evidencia-${idx + 1}`}
                className="h-20 w-20 object-cover rounded border border-gray-200 cursor-pointer"
                onClick={() => setPreview(src)} />
              <button type="button" onClick={() => remove(idx)}
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

      {/* Webcam modal */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-4 flex flex-col gap-3 w-[90vw] max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Cámara</h3>
              <button onClick={stopCamera} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  Iniciando cámara...
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={stopCamera}>Cancelar</Button>
              <Button onClick={takeSnapshot} disabled={!cameraReady}
                className="bg-blue-600 hover:bg-blue-700 px-8">
                <Camera className="h-4 w-4 mr-2" /> Capturar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setPreview(null)}>
          <img src={preview} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreview(null)}>
            <X className="h-7 w-7" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ItemRows — tabla de artículos con variantes (color/marca/talla) ──────────
function ItemRows({
  items,
  maxQtyFn,
  onChange,
  onRemove,
  allowNegative = false,
}: {
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
                <Input type="number"
                  min={allowNegative ? -9999 : 1}
                  max={maxQtyFn(item.productId)}
                  value={item.quantity}
                  onChange={e => onChange(item.productId, 'quantity', Number(e.target.value))}
                  className="h-7 w-20 text-right text-sm" />
                <button type="button"
                  onClick={() => setExpanded(p => ({ ...p, [item.productId]: !isExpanded }))}
                  className={`h-7 px-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${
                    hasVariants ? 'border-purple-300 text-purple-600 bg-purple-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`} title="Color / Marca / Talla">
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  C/M/T
                </button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                  onClick={() => onRemove(item.productId)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div className="px-3 pb-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-2 bg-gray-50">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Color</Label>
                  <Input className="h-7 text-sm" placeholder="Ej: Rojo"
                    value={item.color || ''} onChange={e => onChange(item.productId, 'color', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Marca</Label>
                  <Input className="h-7 text-sm" placeholder="Ej: Nike"
                    value={item.brand || ''} onChange={e => onChange(item.productId, 'brand', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Talla</Label>
                  <Input className="h-7 text-sm" placeholder="Ej: M / 42"
                    value={item.size || ''} onChange={e => onChange(item.productId, 'size', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Export helpers ────────────────────────────────────────────────────────────
function exportToExcel(
  txList: WarehouseTransaction[],
  warehouseName: string
) {
  const rows: Record<string, string | number>[] = [];

  txList.forEach(tx => {
    tx.items.forEach(item => {
      rows.push({
        'Tipo': typeLabel(tx.type),
        'Bodega': tx.warehouseName || warehouseName,
        'Referencia': item.reference || '-',
        'Producto': item.productName,
        'Código de barras': item.barcode || '-',
        'Cantidad': item.quantity,
        'Fecha': formatDateShort(tx.createdAt),
        'Notas': tx.notes || '-',
        'Registrado por': tx.createdBy,
        'Foto adjunta': (tx.evidenceImages?.length ?? 0) > 0 ? 'Sí' : 'No',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 30 },
    { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 30 },
    { wch: 18 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  XLSX.writeFile(wb, `movimientos_bodega_${Date.now()}.xlsx`);
  toast.success('Excel exportado');
}

async function exportToPDF(
  txList: WarehouseTransaction[],
  warehouseName: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const checkPage = (neededH: number, curY: number): number => {
    if (curY + neededH > pageH - 15) { doc.addPage(); return 15; }
    return curY;
  };

  // ── Portada / Encabezado ──
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME DE PRÉSTAMO DE ARTÍCULOS', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bodega: ${warehouseName}`, margin, 20);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageW - margin, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  let y = 36;

  for (let tIdx = 0; tIdx < txList.length; tIdx++) {
    const tx = txList[tIdx];

    y = checkPage(20, y);

    // ── Encabezado del movimiento ──
    const headerColor: [number, number, number] =
      tx.type === 'loan'     ? [255, 237, 213] :
      tx.type === 'return'   ? [220, 252, 231] :
      tx.type === 'exchange' ? [243, 232, 255] :
                               [219, 234, 254];
    const headerTextColor: [number, number, number] =
      tx.type === 'loan'     ? [154, 52, 18]  :
      tx.type === 'return'   ? [22, 101, 52]  :
      tx.type === 'exchange' ? [107, 33, 168] :
                               [30, 64, 175];

    doc.setFillColor(...headerColor);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...headerTextColor);
    doc.text(typeLabel(tx.type).toUpperCase(), margin + 3, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Fecha: ${formatDate(tx.createdAt)}`, margin + 32, y + 6.5);
    doc.text(`Registrado por: ${tx.createdBy}`, pageW - margin, y + 6.5, { align: 'right' });
    y += 13;

    if (tx.notes) {
      y = checkPage(8, y);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Notas: ${tx.notes}`, margin + 2, y);
      y += 7;
    }

    // ── Para cambios: separar artículos que salen y que entran ──
    const renderItems = (items: WarehouseTransactionItem[], sectionLabel?: string, sectionColor?: [number,number,number]) => {
      if (items.length === 0) return;
      if (sectionLabel) {
        y = checkPage(10, y);
        doc.setFillColor(...(sectionColor ?? [243, 244, 246]));
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(sectionLabel, margin + 3, y + 5);
        y += 9;
      }

      for (const item of items) {
        const variants = variantTags(item);
        const boxH = variants.length > 0 ? 26 : 22;
        y = checkPage(boxH, y);

        // Caja del artículo
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(margin, y, contentW, boxH, 1.5, 1.5, 'FD');

        // Etiqueta tipo
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('ARTÍCULO', margin + 3, y + 5);

        // Nombre
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        const nameTxt = item.productName.length > 48 ? item.productName.substring(0, 45) + '...' : item.productName;
        doc.text(nameTxt, margin + 3, y + 12);

        // Ref + código
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Ref: ${item.reference || '-'}   |   Cód: ${item.barcode || '-'}`, margin + 3, y + 17.5);

        // Variantes (color, marca, talla)
        if (variants.length > 0) {
          doc.setFontSize(7.5);
          doc.setTextColor(107, 33, 168);
          doc.text(variants.join('   '), margin + 3, y + 23);
        }

        // Cantidad — caja azul derecha
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(pageW - margin - 28, y + 3, 26, 16, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('CANTIDAD', pageW - margin - 28 + 13, y + 9, { align: 'center' });
        doc.setFontSize(14);
        doc.text(String(item.quantity), pageW - margin - 28 + 13, y + 17, { align: 'center' });

        y += boxH + 3;
      }
    };

    // ── Artículos del movimiento ──
    if (tx.type === 'exchange') {
      const outItems = tx.items.filter(i => (i.direction ?? 'out') === 'out');
      const inItems  = tx.items.filter(i => i.direction === 'in');
      renderItems(inItems,  '▲  ARTÍCULO PRESTADO QUE SALE DE LA BODEGA',                   [255, 237, 213]);
      renderItems(outItems, '▼  ARTÍCULO DE REEMPLAZO — NUEVO INGRESO AL INVENTARIO',       [220, 252, 231]);
    } else {
      renderItems(tx.items);
    }

    // ── Imágenes de evidencia ──
    if (tx.evidenceImages && tx.evidenceImages.length > 0) {
      y = checkPage(12, y);

      // Título sección imágenes
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, contentW, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`EVIDENCIA FOTOGRÁFICA (${tx.evidenceImages.length} foto${tx.evidenceImages.length > 1 ? 's' : ''})`, margin + 3, y + 5.5);
      y += 11;

      // Imágenes: 2 por fila, tamaño grande
      const imgW = (contentW - 6) / 2;
      const imgH = imgW * 0.75; // aspect ratio 4:3
      const gap = 6;
      let col = 0;

      for (const imgSrc of tx.evidenceImages) {
        y = checkPage(imgH + 4, y);
        const x = margin + col * (imgW + gap);

        // Marco de imagen
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, imgW, imgH, 'FD');

        try {
          const fmt = imgSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(imgSrc, fmt, x, y, imgW, imgH);
        } catch {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text('[Imagen no disponible]', x + imgW / 2, y + imgH / 2, { align: 'center' });
        }

        col++;
        if (col >= 2) { col = 0; y += imgH + 4; }
      }
      if (col !== 0) y += imgH + 4; // flush last row
      y += 4;
    }

    // ── Separador entre movimientos ──
    if (tIdx < txList.length - 1) {
      y = checkPage(10, y);
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(margin, y, pageW - margin, y);
      doc.setLineDashPattern([], 0);
      y += 8;
    }
  }

  // ── Pie de página en cada hoja ──
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(`${warehouseName} — Informe de movimientos`, margin, pageH - 7);
    doc.text(`Pág. ${p} / ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });
  }

  doc.save(`prestamo_${warehouseName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  toast.success('PDF generado correctamente');
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Warehouses() {
  const { user, isAdmin } = useAuth();
  const { products, updateStock } = useInventory();
  const {
    warehouses, transactions,
    addWarehouse, updateWarehouse, deleteWarehouse,
    addTransaction, deleteTransaction,
    getWarehouseStock,
  } = useWarehouses();

  // ── Selection ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedWarehouse = warehouses.find(w => w.id === selectedId) ?? null;

  // ── Warehouse CRUD dialog ──
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ExternalWarehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseFormState>(emptyWarehouseForm);

  // ── Transaction dialog ──
  const [txDialog, setTxDialog] = useState(false);
  const [txType, setTxType] = useState<WarehouseTransactionType>('loan');
  const [txItems, setTxItems] = useState<TransactionItemRow[]>([]);
  // Para cambios: artículos que regresan (direction:'in')
  const [txInItems, setTxInItems] = useState<TransactionItemRow[]>([]);
  const [txNotes, setTxNotes] = useState('');
  const [txImages, setTxImages] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchIn, setProductSearchIn] = useState('');

  // ── Image lightbox (history) ──
  const [lightbox, setLightbox] = useState<string | null>(null);

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

  // ── Computed ──
  const warehouseStock = useMemo(
    () => (selectedId ? getWarehouseStock(selectedId) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, transactions]
  );

  const warehouseTransactions = useMemo(
    () => transactions.filter(t => t.warehouseId === selectedId),
    [transactions, selectedId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
  }, [products, productSearch]);

  // ─── Warehouse dialog ─────────────────────────────────────────────────────
  const openCreateWarehouse = () => {
    setEditingWarehouse(null);
    setWarehouseForm(emptyWarehouseForm);
    setWarehouseDialog(true);
  };

  const openEditWarehouse = (w: ExternalWarehouse) => {
    setEditingWarehouse(w);
    setWarehouseForm({
      name: w.name, location: w.location || '', contact: w.contact || '',
      phone: w.phone || '', description: w.description || '',
    });
    setWarehouseDialog(true);
  };

  const handleSaveWarehouse = () => {
    if (!warehouseForm.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, {
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim() || undefined,
        contact: warehouseForm.contact.trim() || undefined,
        phone: warehouseForm.phone.trim() || undefined,
        description: warehouseForm.description.trim() || undefined,
      });
      toast.success('Bodega actualizada');
    } else {
      addWarehouse({
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim() || undefined,
        contact: warehouseForm.contact.trim() || undefined,
        phone: warehouseForm.phone.trim() || undefined,
        description: warehouseForm.description.trim() || undefined,
      });
      toast.success('Bodega creada');
    }
    setWarehouseDialog(false);
  };

  const handleDeleteWarehouse = (w: ExternalWarehouse) => {
    if (!confirm(`¿Eliminar la bodega "${w.name}"? Se eliminarán todos sus movimientos.`)) return;
    deleteWarehouse(w.id);
    if (selectedId === w.id) setSelectedId(null);
    toast.success('Bodega eliminada');
  };

  // ─── Transaction dialog ───────────────────────────────────────────────────
  const openTxDialog = (type: WarehouseTransactionType) => {
    setTxType(type);
    setTxItems([]);
    setTxInItems([]);
    setTxNotes('');
    setTxImages([]);
    setProductSearch('');
    setProductSearchIn('');
    setTxDialog(true);
  };

  // Abre el diálogo de cambio con el artículo prestado ya pre-seleccionado en la sección "regresa"
  const openExchangeFromStock = (productId: string) => {
    const info = warehouseStock[productId];
    if (!info) return;
    setTxType('exchange');
    setTxItems([]);
    setTxNotes('');
    setTxImages([]);
    setProductSearch('');
    setProductSearchIn('');
    // Pre-cargar el artículo prestado en la lista "in" (regresa del cliente al inventario)
    setTxInItems([{
      key: productId + 'in',
      productId,
      productName: info.productName,
      barcode: info.barcode,
      reference: info.reference,
      quantity: 1,
      color: '', brand: '', size: '',
      direction: 'in',
    }]);
    setTxDialog(true);
  };

  const makeItemRow = (product: ReturnType<typeof products.find>, direction?: 'out' | 'in'): TransactionItemRow => ({
    key: product!.id + (direction ?? ''),
    productId: product!.id,
    productName: product!.name,
    barcode: product!.barcode,
    reference: product!.reference,
    quantity: 1,
    color: '', brand: '', size: '',
    direction,
  });

  const addItemToTx = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (txItems.some(i => i.productId === productId)) { toast.error('Ya está en la lista'); return; }
    setTxItems(prev => [...prev, makeItemRow(product)]);
    setProductSearch('');
  };

  const addItemToTxIn = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (txInItems.some(i => i.productId === productId)) { toast.error('Ya está en la lista'); return; }
    setTxInItems(prev => [...prev, makeItemRow(product, 'in')]);
    setProductSearchIn('');
  };

  const updateItem = (setter: typeof setTxItems, productId: string, field: string, value: string | number) =>
    setter(prev => prev.map(i => i.productId === productId ? { ...i, [field]: value } : i));

  const removeItem = (productId: string) => setTxItems(prev => prev.filter(i => i.productId !== productId));
  const removeInItem = (productId: string) => setTxInItems(prev => prev.filter(i => i.productId !== productId));

  const handleSubmitTransaction = () => {
    if (!selectedId) return;

    const allOut = txType === 'exchange'
      ? txItems.map(i => ({ ...i, direction: 'out' as const }))
      : txItems;
    const allIn  = txType === 'exchange' ? txInItems : [];

    if (allOut.length === 0 && allIn.length === 0) {
      toast.error('Agrega al menos un producto'); return;
    }
    if ([...allOut, ...allIn].some(i => i.quantity <= 0)) {
      toast.error('Las cantidades deben ser mayores a 0'); return;
    }

    // Validar stock saliente — solo para préstamos (no para cambios: el reemplazo viene de afuera)
    if (txType === 'loan') {
      for (const item of allOut) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        if (item.quantity > product.stock) {
          toast.error(`Stock insuficiente para "${item.productName}". Disponible: ${product.stock}`);
          return;
        }
      }
    }

    // Validar devoluciones desde bodega
    if (txType === 'return') {
      for (const item of allOut) {
        const stockAtWarehouse = warehouseStock[item.productId]?.quantity ?? 0;
        if (item.quantity > stockAtWarehouse) {
          toast.error(`No puedes devolver más de ${stockAtWarehouse} uds. de "${item.productName}"`);
          return;
        }
      }
    }

    // Para cambio: validar que el artículo prestado (in) esté en bodega
    if (txType === 'exchange') {
      for (const item of allIn) {
        const stockAtWarehouse = warehouseStock[item.productId]?.quantity ?? 0;
        if (item.quantity > stockAtWarehouse) {
          toast.error(`"${item.productName}" no tiene ${item.quantity} uds. en esta bodega`);
          return;
        }
      }
    }

    const allItems = [...allOut, ...allIn];
    addTransaction(selectedId, txType, allItems, txNotes, user?.name || 'Sistema',
      txImages.length > 0 ? txImages : undefined);

    // Actualizar inventario principal
    allOut.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      if (txType === 'loan') {
        // Préstamo: el artículo sale de nuestro inventario hacia la bodega
        updateStock(product.id, product.stock - item.quantity);
      } else if (txType === 'exchange') {
        // Cambio: el artículo de reemplazo viene de AFUERA (otra bodega ajena)
        // → se registra como NUEVO INGRESO al inventario (suma, no resta)
        updateStock(product.id, product.stock + item.quantity);
      } else if (txType === 'return') {
        updateStock(product.id, product.stock + item.quantity);
      } else {
        // Ajuste
        updateStock(product.id, product.stock + item.quantity);
      }
    });
    // El artículo prestado (allIn / direction:'in') se queda en la bodega externa —
    // ya fue descontado del inventario cuando se hizo el préstamo, no regresa.
    // Solo desaparece de la vista de bodega (manejado por getWarehouseStock).
    // → NO se modifica el inventario principal aquí.

    const labels: Record<WarehouseTransactionType, string> = {
      loan: 'Préstamo registrado',
      return: 'Devolución registrada',
      adjustment: 'Ajuste registrado',
      exchange: 'Cambio registrado',
    };
    toast.success(labels[txType]);
    setTxDialog(false);
  };

  const handleDeleteTransaction = (txId: string) => {
    if (!confirm('¿Eliminar este movimiento? El inventario principal NO se revertirá automáticamente.')) return;
    deleteTransaction(txId);
    toast.success('Movimiento eliminado');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bodegas Externas</h1>
            <p className="text-sm text-gray-500">Préstamos y cruces de inventario</p>
          </div>
        </div>
        {isAdmin() && (
          <Button onClick={openCreateWarehouse} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Bodega
          </Button>
        )}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── Warehouses list ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Bodegas ({warehouses.length})
          </h2>
          {warehouses.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed rounded-lg">
              <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No hay bodegas registradas
            </div>
          )}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {warehouses.map(w => {
              const stock = getWarehouseStock(w.id);
              const totalUnits = Object.values(stock).reduce((s, v) => s + v.quantity, 0);
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === w.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{w.name}</p>
                      <p className="text-xs text-gray-400">{w.code}</p>
                      {w.location && <p className="text-xs text-gray-500 truncate">{w.location}</p>}
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                      {totalUnits} uds
                    </span>
                  </div>
                  {isAdmin() && (
                    <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                        onClick={() => openEditWarehouse(w)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteWarehouse(w)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Warehouse detail ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedWarehouse ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona una bodega para ver su detalle</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Warehouse header */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedWarehouse.name}</h2>
                    <p className="text-sm text-gray-500">{selectedWarehouse.code}</p>
                    <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-600">
                      {selectedWarehouse.location && <span>📍 {selectedWarehouse.location}</span>}
                      {selectedWarehouse.contact && <span>👤 {selectedWarehouse.contact}</span>}
                      {selectedWarehouse.phone && <span>📞 {selectedWarehouse.phone}</span>}
                    </div>
                    {selectedWarehouse.description && (
                      <p className="text-xs text-gray-500 mt-1">{selectedWarehouse.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => openTxDialog('loan')}>
                      <ArrowDownToLine className="h-4 w-4 mr-1" /> Préstamo
                    </Button>
                    <Button size="sm" variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => openTxDialog('return')}>
                      <ArrowUpFromLine className="h-4 w-4 mr-1" /> Devolución
                    </Button>
                    <Button size="sm" variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => openTxDialog('exchange')}>
                      <ArrowLeftRight className="h-4 w-4 mr-1" /> Cambio
                    </Button>
                    {isAdmin() && (
                      <Button size="sm" variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => openTxDialog('adjustment')}>
                        <SlidersHorizontal className="h-4 w-4 mr-1" /> Ajuste
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      onClick={() => exportToExcel(warehouseTransactions, selectedWarehouse.name)}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => exportToPDF(warehouseTransactions, selectedWarehouse.name)}>
                      <FileText className="h-4 w-4 mr-1" /> PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'stock'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('stock')}
                >
                  <Package className="inline h-4 w-4 mr-1" />
                  Stock en Bodega ({Object.keys(warehouseStock).length})
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  <History className="inline h-4 w-4 mr-1" />
                  Historial ({warehouseTransactions.length})
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-auto">
                {activeTab === 'stock' && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {Object.keys(warehouseStock).length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No hay productos en esta bodega
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Código de Barras</TableHead>
                            <TableHead className="text-right">Uds. en Bodega</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(warehouseStock).map(([productId, info]) => (
                            <TableRow key={productId}>
                              <TableCell className="font-medium">{info.productName}</TableCell>
                              <TableCell className="text-gray-500 text-sm">{info.reference || '-'}</TableCell>
                              <TableCell className="text-gray-500 text-sm font-mono">{info.barcode || '-'}</TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                  {info.quantity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs h-7 px-2"
                                  onClick={() => openExchangeFromStock(productId)}
                                  title="Registrar cambio por este artículo"
                                >
                                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                                  Cambiar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="flex flex-col gap-3">
                    {warehouseTransactions.length === 0 ? (
                      <div className="bg-white rounded-lg border border-gray-200 text-center py-10 text-gray-400 text-sm">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Sin movimientos registrados
                      </div>
                    ) : (
                      warehouseTransactions.map(tx => (
                        <div key={tx.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {typeBadge(tx.type)}
                              <span className="text-sm text-gray-600">{formatDate(tx.createdAt)}</span>
                              <span className="text-sm text-gray-500">por <strong>{tx.createdBy}</strong></span>
                            </div>
                            {isAdmin() && (
                              <Button size="sm" variant="ghost"
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                onClick={() => handleDeleteTransaction(tx.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>

                          {tx.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">{tx.notes}</p>
                          )}

                          {/* Items */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tx.items.map(item => {
                              const isIn = item.direction === 'in'; // direction:'in' = prestado que SALE de bodega
                              const isExchange = tx.type === 'exchange';
                              const tags = variantTags(item);
                              return (
                                <span key={item.productId + (item.direction ?? '')}
                                  className={`text-xs px-2 py-1 rounded flex flex-col gap-0.5 ${
                                    isExchange && isIn
                                      ? 'bg-orange-100 text-orange-800'   // prestado que sale
                                      : isExchange && !isIn
                                      ? 'bg-green-100 text-green-800'     // reemplazo que entra
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  <span>
                                    {isExchange && isIn && <ArrowUpFromLine className="inline h-3 w-3 mr-0.5 text-orange-600" />}
                                    {isExchange && !isIn && <ArrowDownToLine className="inline h-3 w-3 mr-0.5 text-green-600" />}
                                    <strong>{item.quantity}×</strong> {item.productName}
                                    {item.reference && <span className="text-gray-400 ml-1">({item.reference})</span>}
                                    {isExchange && isIn && <span className="ml-1 text-orange-600 font-medium">[SALE]</span>}
                                    {isExchange && !isIn && <span className="ml-1 text-green-600 font-medium">[ENTRA]</span>}
                                  </span>
                                  {tags.length > 0 && (
                                    <span className="text-purple-600 font-medium">{tags.join(' · ')}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>

                          {/* Evidence images */}
                          {tx.evidenceImages && tx.evidenceImages.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                <ImageIcon className="h-3 w-3" />
                                Evidencia fotográfica ({tx.evidenceImages.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {tx.evidenceImages.map((src, idx) => (
                                  <img
                                    key={idx}
                                    src={src}
                                    alt={`evidencia-${idx + 1}`}
                                    className="h-16 w-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                                    onClick={() => setLightbox(src)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Global Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="evidencia" className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="h-7 w-7" />
          </button>
        </div>
      )}

      {/* ── Warehouse CRUD Dialog ── */}
      <Dialog open={warehouseDialog} onOpenChange={setWarehouseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={warehouseForm.name}
                onChange={e => setWarehouseForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Bodega Norte" />
            </div>
            <div>
              <Label>Ubicación</Label>
              <Input value={warehouseForm.location}
                onChange={e => setWarehouseForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Dirección o referencia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Persona de contacto</Label>
                <Input value={warehouseForm.contact}
                  onChange={e => setWarehouseForm(f => ({ ...f, contact: e.target.value }))}
                  placeholder="Nombre" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={warehouseForm.phone}
                  onChange={e => setWarehouseForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Número" />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={warehouseForm.description} rows={3}
                onChange={e => setWarehouseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notas adicionales" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveWarehouse}>
              {editingWarehouse ? 'Guardar cambios' : 'Crear bodega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transaction Dialog ── */}
      <Dialog open={txDialog} onOpenChange={setTxDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {txType === 'loan' && 'Nuevo Préstamo'}
              {txType === 'return' && 'Devolución de Productos'}
              {txType === 'adjustment' && 'Ajuste de Inventario'}
              {txType === 'exchange' && 'Cambio de Artículo'}
              {selectedWarehouse && ` — ${selectedWarehouse.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5">

            {/* ── CAMBIO: paso 1 — artículo prestado que SALE de la bodega (direction:'in') ── */}
            {txType === 'exchange' && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 flex flex-col gap-3">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4" />
                  1. Artículo PRESTADO que SALE de la bodega
                  <span className="text-xs font-normal text-orange-600">(selecciona el que fue prestado)</span>
                </p>

                {Object.keys(warehouseStock).length === 0 ? (
                  <p className="text-sm text-gray-400 bg-white rounded p-3 border border-gray-200">
                    No hay artículos prestados en esta bodega
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-9 bg-white" placeholder="Filtrar artículos en bodega..."
                        value={productSearchIn} onChange={e => setProductSearchIn(e.target.value)} />
                    </div>
                    <div className="border border-orange-200 rounded-md max-h-40 overflow-y-auto bg-white">
                      {Object.entries(warehouseStock)
                        .filter(([, info]) =>
                          !productSearchIn ||
                          info.productName.toLowerCase().includes(productSearchIn.toLowerCase()) ||
                          (info.reference ?? '').toLowerCase().includes(productSearchIn.toLowerCase())
                        )
                        .map(([productId, info]) => {
                          const added = txInItems.some(i => i.productId === productId);
                          return (
                            <button key={productId} disabled={added}
                              className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors ${
                                added
                                  ? 'bg-orange-50 text-orange-700 cursor-default opacity-70'
                                  : 'hover:bg-orange-50 cursor-pointer'
                              }`}
                              onClick={() => { if (!added) { addItemToTxIn(productId); setProductSearchIn(''); } }}>
                              <span className="font-medium">
                                {info.productName}
                                {info.reference && <span className="text-gray-400 text-xs ml-1">({info.reference})</span>}
                              </span>
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
                  onRemove={removeInItem} />
              </div>
            )}

            {/* ── CAMBIO: paso 2 — artículo de reemplazo que ENTRA | Préstamo / Ajuste ── */}
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
                          <button key={p.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between border-b border-gray-100 last:border-0"
                            onClick={() => addItemToTx(p.id)}>
                            <span>{p.name} <span className="text-gray-400 text-xs">({p.reference})</span></span>
                            <span className="text-gray-500 text-xs">Stock: {p.stock}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <ItemRows items={txItems}
                  maxQtyFn={id => txType === 'loan' || txType === 'exchange' ? (products.find(p => p.id === id)?.stock ?? 999) : 9999}
                  onChange={(id, f, v) => updateItem(setTxItems, id, f, v)}
                  onRemove={removeItem}
                  allowNegative={txType === 'adjustment'} />
                {txType === 'adjustment' && <p className="text-xs text-gray-500">Positivo = añadir al inventario · Negativo = descontar</p>}
              </div>
            )}

            {/* ── Devolución normal ── */}
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
                            if (!added) setTxItems(prev => [...prev, {
                              key: productId, productId, productName: info.productName,
                              barcode: info.barcode, reference: info.reference, quantity: 1,
                              color: '', brand: '', size: '',
                            }]);
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
                  onRemove={removeItem} />
              </div>
            )}

            {/* Evidence photos */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <ImageIcon className="h-4 w-4 text-gray-500" />
                Evidencia fotográfica
                <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </Label>
              <ImageCapture images={txImages} onChange={setTxImages} />
            </div>

            {/* Notes */}
            <div>
              <Label>Notas / Motivo</Label>
              <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)}
                placeholder="Descripción del movimiento..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmitTransaction}
              disabled={txItems.length === 0 && txInItems.length === 0}
              className={
                txType === 'loan' ? 'bg-orange-600 hover:bg-orange-700' :
                txType === 'return' ? 'bg-green-600 hover:bg-green-700' :
                txType === 'exchange' ? 'bg-purple-600 hover:bg-purple-700' : ''
              }>
              {txType === 'loan' && 'Registrar Préstamo'}
              {txType === 'return' && 'Registrar Devolución'}
              {txType === 'adjustment' && 'Registrar Ajuste'}
              {txType === 'exchange' && 'Registrar Cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
