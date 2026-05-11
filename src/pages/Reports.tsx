import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingBag, Warehouse, RotateCcw, ClipboardList, TrendingUp, Activity } from 'lucide-react';
import TraceabilityTab from '@/components/reports/TraceabilityTab';
import InventoryReportTab from '@/components/reports/InventoryReportTab';
import SalesReportTab from '@/components/reports/SalesReportTab';
import PurchasesReportTab from '@/components/reports/PurchasesReportTab';
import WarehousesReportTab from '@/components/reports/WarehousesReportTab';
import ReturnsReportTab from '@/components/reports/ReturnsReportTab';
import StockCountsTab from '@/components/reports/StockCountsTab';

export default function Reports() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
        <p className="mt-1 text-gray-500 text-sm">Historial, trazabilidad y reportes del sistema</p>
      </div>

      <Tabs defaultValue="trazabilidad" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="trazabilidad" className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />Trazabilidad</TabsTrigger>
          <TabsTrigger value="inventario" className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />Inventario</TabsTrigger>
          <TabsTrigger value="ventas" className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Ventas</TabsTrigger>
          <TabsTrigger value="compras" className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />Compras</TabsTrigger>
          <TabsTrigger value="bodegas" className="flex items-center gap-1"><Warehouse className="h-3.5 w-3.5" />Bodegas</TabsTrigger>
          <TabsTrigger value="devoluciones" className="flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" />Devoluciones</TabsTrigger>
          <TabsTrigger value="conteos" className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />Conteos</TabsTrigger>
        </TabsList>

        <TabsContent value="trazabilidad"><TraceabilityTab /></TabsContent>
        <TabsContent value="inventario"><InventoryReportTab /></TabsContent>
        <TabsContent value="ventas"><SalesReportTab /></TabsContent>
        <TabsContent value="compras"><PurchasesReportTab /></TabsContent>
        <TabsContent value="bodegas"><WarehousesReportTab /></TabsContent>
        <TabsContent value="devoluciones"><ReturnsReportTab /></TabsContent>
        <TabsContent value="conteos"><StockCountsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
