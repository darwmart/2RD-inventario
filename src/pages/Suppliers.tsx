import { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import SupplierFormDialog from '@/components/SupplierFormDialog';
import { Supplier } from '@/types';
import { Plus, Edit, Trash2, Search, Building2 } from 'lucide-react';
import { toast } from 'sonner';

// Página de gestión de proveedores - diseño inspirado en software de gestión comercial
export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Filtrar proveedores
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;

    const term = searchTerm.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.fiscalName.toLowerCase().includes(term) ||
      supplier.commercialName?.toLowerCase().includes(term) ||
      supplier.taxId.toLowerCase().includes(term) ||
      supplier.phone.toLowerCase().includes(term) ||
      supplier.email.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const handleNew = () => {
    setEditingSupplier(null);
    setIsDialogOpen(true);
  };

  const handleEdit = () => {
    if (!selectedSupplier) {
      toast.error('Selecciona un proveedor para editar');
      return;
    }
    setEditingSupplier(selectedSupplier);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (!selectedSupplier) {
      toast.error('Selecciona un proveedor para borrar');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar el proveedor "${selectedSupplier.fiscalName}"?`)) {
      deleteSupplier(selectedSupplier.id);
      setSelectedSupplier(null);
      toast.success('Proveedor eliminado correctamente');
    }
  };

  const handleSave = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierData);
      toast.success('Proveedor actualizado correctamente');
    } else {
      addSupplier(supplierData);
      toast.success('Proveedor creado correctamente');
    }
    setIsDialogOpen(false);
    setEditingSupplier(null);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Encabezado */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Fichero de proveedores
            </h1>
            <p className="text-sm text-gray-600 mt-1">Administre el fichero de proveedores de su empresa.</p>
          </div>

          <div className="relative w-[320px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, N.I.T., teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Barra de herramientas */}
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
            <Button size="sm" variant="outline" onClick={handleEdit} disabled={!selectedSupplier}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={handleDelete} disabled={!selectedSupplier}>
              <Trash2 className="h-4 w-4 mr-1" />
              Borrar
            </Button>
          </div>
        </Card>
      </div>

      {/* Tabla de proveedores */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[80px]">Cód.</TableHead>
              <TableHead>Nombre fiscal</TableHead>
              <TableHead>Nombre comercial</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>N.I.T.</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-12 w-12 text-gray-300" />
                    <p className="text-gray-500 font-medium">
                      {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                    </p>
                    {!searchTerm && (
                      <Button variant="outline" size="sm" onClick={handleNew}>
                        <Plus className="h-4 w-4 mr-1" />
                        Crear primer proveedor
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedSupplier?.id === supplier.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSupplier(supplier)}
                  onDoubleClick={() => {
                    setEditingSupplier(supplier);
                    setIsDialogOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-sm text-gray-600">
                    {supplier.code || supplier.id.slice(0, 6)}
                  </TableCell>
                  <TableCell className="font-medium">{supplier.fiscalName}</TableCell>
                  <TableCell className="text-gray-600">
                    {supplier.commercialName || <span className="text-gray-400 text-xs">-</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{supplier.phone}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {supplier.taxId || <span className="text-gray-400 text-xs">-</span>}
                  </TableCell>
                  <TableCell>
                    {supplier.isProvider ? (
                      <Badge variant="default" className="text-xs">Proveedor</Badge>
                    ) : supplier.isCreditor ? (
                      <Badge variant="secondary" className="text-xs">Acreedor</Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer con contador */}
        <div className="border-t p-3 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>
              N° de proveedores mostrados: <strong>{filteredSuppliers.length}</strong>
            </span>
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>
      </Card>

      {/* Modal de formulario */}
      <SupplierFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        supplier={editingSupplier}
        existingSuppliers={suppliers}
        onSave={handleSave}
      />
    </div>
  );
}
