import { WarehouseTransaction, WarehouseTransactionItem, WarehouseTransactionType } from '@/types';
import { formatDate, formatDateShort } from '@/utils/dates';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

export function typeLabel(type: WarehouseTransactionType): string {
  if (type === 'loan') return 'Préstamo';
  if (type === 'return') return 'Devolución';
  if (type === 'exchange') return 'Cambio';
  return 'Ajuste';
}

export function variantTags(item: WarehouseTransactionItem): string[] {
  const tags: string[] = [];
  if (item.color) tags.push(`Color: ${item.color}`);
  if (item.brand) tags.push(`Marca: ${item.brand}`);
  if (item.size) tags.push(`Talla: ${item.size}`);
  return tags;
}

export function exportToExcel(txList: WarehouseTransaction[], warehouseName: string) {
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

export async function exportToPDF(txList: WarehouseTransaction[], warehouseName: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const checkPage = (neededH: number, curY: number): number => {
    if (curY + neededH > pageH - 15) { doc.addPage(); return 15; }
    return curY;
  };

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

  const renderItems = (items: WarehouseTransactionItem[], sectionLabel?: string, sectionColor?: [number, number, number]) => {
    if (items.length === 0) return;
    if (sectionLabel) {
      y = checkPage(10, y);
      doc.setFillColor(...(sectionColor ?? [243, 244, 246]));
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
      doc.text(sectionLabel, margin + 3, y + 5);
      y += 9;
    }
    for (const item of items) {
      const variants = variantTags(item);
      const boxH = variants.length > 0 ? 26 : 22;
      y = checkPage(boxH, y);
      doc.setDrawColor(220, 220, 220); doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, y, contentW, boxH, 1.5, 1.5, 'FD');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text('ARTÍCULO', margin + 3, y + 5);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
      const nameTxt = item.productName.length > 48 ? item.productName.substring(0, 45) + '...' : item.productName;
      doc.text(nameTxt, margin + 3, y + 12);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Ref: ${item.reference || '-'}   |   Cód: ${item.barcode || '-'}`, margin + 3, y + 17.5);
      if (variants.length > 0) {
        doc.setFontSize(7.5); doc.setTextColor(107, 33, 168);
        doc.text(variants.join('   '), margin + 3, y + 23);
      }
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(pageW - margin - 28, y + 3, 26, 16, 2, 2, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('CANTIDAD', pageW - margin - 28 + 13, y + 9, { align: 'center' });
      doc.setFontSize(14);
      doc.text(String(item.quantity), pageW - margin - 28 + 13, y + 17, { align: 'center' });
      y += boxH + 3;
    }
  };

  for (let tIdx = 0; tIdx < txList.length; tIdx++) {
    const tx = txList[tIdx];
    y = checkPage(20, y);
    const headerColor: [number, number, number] =
      tx.type === 'loan' ? [255, 237, 213] : tx.type === 'return' ? [220, 252, 231] :
      tx.type === 'exchange' ? [243, 232, 255] : [219, 234, 254];
    const headerTextColor: [number, number, number] =
      tx.type === 'loan' ? [154, 52, 18] : tx.type === 'return' ? [22, 101, 52] :
      tx.type === 'exchange' ? [107, 33, 168] : [30, 64, 175];
    doc.setFillColor(...headerColor);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...headerTextColor);
    doc.text(typeLabel(tx.type).toUpperCase(), margin + 3, y + 6.5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    doc.text(`Fecha: ${formatDate(tx.createdAt)}`, margin + 32, y + 6.5);
    doc.text(`Registrado por: ${tx.createdBy}`, pageW - margin, y + 6.5, { align: 'right' });
    y += 13;
    if (tx.notes) {
      y = checkPage(8, y);
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100);
      doc.text(`Notas: ${tx.notes}`, margin + 2, y);
      y += 7;
    }
    if (tx.type === 'exchange') {
      const outItems = tx.items.filter(i => (i.direction ?? 'out') === 'out');
      const inItems = tx.items.filter(i => i.direction === 'in');
      renderItems(inItems, '▲  ARTÍCULO PRESTADO QUE SALE DE LA BODEGA', [255, 237, 213]);
      renderItems(outItems, '▼  ARTÍCULO DE REEMPLAZO — NUEVO INGRESO AL INVENTARIO', [220, 252, 231]);
    } else {
      renderItems(tx.items);
    }
    if (tx.evidenceImages && tx.evidenceImages.length > 0) {
      y = checkPage(12, y);
      doc.setFillColor(243, 244, 246); doc.rect(margin, y, contentW, 8, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
      doc.text(`EVIDENCIA FOTOGRÁFICA (${tx.evidenceImages.length} foto${tx.evidenceImages.length > 1 ? 's' : ''})`, margin + 3, y + 5.5);
      y += 11;
      const imgW = (contentW - 6) / 2;
      const imgH = imgW * 0.75;
      const gap = 6;
      let col = 0;
      for (const imgSrc of tx.evidenceImages) {
        y = checkPage(imgH + 4, y);
        const x = margin + col * (imgW + gap);
        doc.setDrawColor(200, 200, 200); doc.setFillColor(240, 240, 240);
        doc.rect(x, y, imgW, imgH, 'FD');
        try {
          const fmt = imgSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(imgSrc, fmt, x, y, imgW, imgH);
        } catch {
          doc.setFontSize(7); doc.setTextColor(150, 150, 150);
          doc.text('[Imagen no disponible]', x + imgW / 2, y + imgH / 2, { align: 'center' });
        }
        col++;
        if (col >= 2) { col = 0; y += imgH + 4; }
      }
      if (col !== 0) y += imgH + 4;
      y += 4;
    }
    if (tIdx < txList.length - 1) {
      y = checkPage(10, y);
      doc.setDrawColor(180, 180, 180); doc.setLineDashPattern([2, 2], 0);
      doc.line(margin, y, pageW - margin, y); doc.setLineDashPattern([], 0);
      y += 8;
    }
  }

  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
    doc.text(`${warehouseName} — Informe de movimientos`, margin, pageH - 7);
    doc.text(`Pág. ${p} / ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });
  }
  doc.save(`prestamo_${warehouseName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  toast.success('PDF generado correctamente');
}
