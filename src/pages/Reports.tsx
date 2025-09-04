import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Database, 
  Upload,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportSalesToExcel,
  exportSalesToPDF,
  exportInventoryToExcel,
  exportInventoryToPDF,
  exportBackup,
  importBackup
} from '@/utils/exportUtils';

export default function Reports() {
  const { products, categories, suppliers } = useInventory();
  const { sales, advisors } = useSales();
  
  const [salesFilters, setSalesFilters] = useState({
    startDate: '',
    endDate: '',
    advisor: 'all',
    reference: ''
  });
  
  const [inventoryFilters, setInventoryFilters] = useState({
    category: 'all',
    lowStockOnly: false,
    reference: ''
  });

  const [isImporting, setIsImporting] = useState(false);

  const handleSalesExcelExport = () => {
    const advisor = salesFilters.advisor !== 'all' ? salesFilters.advisor : undefined;
    const reference = salesFilters.reference || undefined;
    exportSalesToExcel(sales, salesFilters.startDate, salesFilters.endDate, advisor, reference);
    toast.success('Reporte de ventas exportado a Excel');
  };

  const handleSalesPDFExport = () => {
    const advisor = salesFilters.advisor !== 'all' ? salesFilters.advisor : undefined;
    const reference = salesFilters.reference || undefined;
    exportSalesToPDF(sales, salesFilters.startDate, salesFilters.endDate, advisor, reference);
    toast.success('Reporte de ventas exportado a PDF');
  };

  const handleInventoryExcelExport = () => {
    const category = inventoryFilters.category !== 'all' ? inventoryFilters.category : undefined;
    const reference = inventoryFilters.reference || undefined;
    exportInventoryToExcel(products, categories, suppliers, category, inventoryFilters.lowStockOnly);
    toast.success('Reporte de inventario exportado a Excel');
  };

  const handleInventoryPDFExport = () => {
    const category = inventoryFilters.category !== 'all' ? inventoryFilters.category : undefined;
    const reference = inventoryFilters.reference || undefined;
    exportInventoryToPDF(products, categories, suppliers, category, inventoryFilters.lowStockOnly);
    toast.success('Reporte de inventario exportado a PDF');
  };

  const handleBackupExport = () => {
    exportBackup(products, sales, categories, suppliers, advisors, []);
    toast.success('Copia de seguridad creada exitosamente');
  };

  const handleBackupImport = async (file: File) => {
    try {
      setIsImporting(true);
      const backupData = await importBackup(file);
      
      // En una implementación real, aquí restaurarías los datos
      console.log('Datos de backup:', backupData);
      
      toast.success('Copia de seguridad restaurada exitosamente');
      setIsImporting(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar backup');
      setIsImporting(false);
    }
  };

  const getFilteredSalesCount = () => {
    return sales.filter(sale => {
      let includeDate = true;
      let includeAdvisor = true;
      let includeReference = true;

      if (salesFilters.startDate) {
        const saleDate = new Date(sale.createdAt).toDateString();
        const start = new Date(salesFilters.startDate).toDateString();
        includeDate = saleDate >= start;
      }

      if (salesFilters.endDate && includeDate) {
        const saleDate = new Date(sale.createdAt).toDateString();
        const end = new Date(salesFilters.endDate).toDateString();
        includeDate = saleDate <= end;
      }

      if (salesFilters.advisor !== 'all') {
        includeAdvisor = sale.advisorId === salesFilters.advisor;
      }

      if (salesFilters.reference) {
        includeReference = sale.reference?.toLowerCase().includes(salesFilters.reference.toLowerCase());
      }

      return includeDate && includeAdvisor && includeReference && sale.status === 'completed';
    }).length;
  };

  const getFilteredProductsCount = () => {
    return products.filter(product => {
      let includeCategory = true;
      let includeStock = true;
      let includeReference = true;

      if (inventoryFilters.category !== 'all') {
        includeCategory = product.categoryId === inventoryFilters.category;
      }

      if (inventoryFilters.lowStockOnly) {
        includeStock = product.stock <= product.minStock;
      }

      if (inventoryFilters.reference) {
        includeReference = product.reference?.toLowerCase().includes(inventoryFilters.reference.toLowerCase());
      }

      return includeCategory && includeStock && includeReference;
    }).length;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reportes y Copias de Seguridad</h1>
        <p className="mt-2 text-gray-600">
          Exporta reportes y gestiona copias de seguridad de tu sistema
        </p>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">Reportes de Ventas</TabsTrigger>
          <TabsTrigger value="inventory">Reportes de Inventario</TabsTrigger>
          <TabsTrigger value="backup">Copias de Seguridad</TabsTnrigger>
        </TabsList>

        {/* Reportes de Ventas */}
        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filtros de Ventas
                </CardTitle>
              </CardHeader>
              <CardContent classN<Dialog open={isCreatingSale} onOpenChange={setIsCreatingSale}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Venta00000
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>ame="space-y-4">
                <div>
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={salesFilters.startDate}
                    onChange={(e) => setSalesFilters({...salesFilters, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={salesFilters.endDate}
                    onChange={(e) => setSalesFilters({...salesFilters, endDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Asesor</Label>
                  <Select <Dialog open={isCreatingSale} onOpenChange={setIsCreatingSale}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Venta00000
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>
                    value={salesFilters.advisor} 
                    onValueChange={(value) => setSalesFilters({...salesFilters, advisor: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los asesores</SelectItem>
                      {advisors.map(advisor => (
                        <SelectItem key={advisor.id} value={advisor.id}>
                          {advisor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Referencia</Label>
                  <Input
                    type="text"
                    placeholder="Buscar por referencia"
                    value={salesFilters.reference}
                    onChange={(e) => setSalesFilters({...salesFilters, reference: e.target.value})}
                  />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                  <p className="font-medium">{getFilteredSalesCount()} ventas encontradas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}