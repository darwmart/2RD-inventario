import { useState, useMemo } from 'react';
import { useSuppliers } from '@/hooks/queries';
import SupplierFormDialog from '@/components/SupplierFormDialog';
import SuppliersToolbar from '@/components/suppliers/SuppliersToolbar';
import SuppliersTable from '@/components/suppliers/SuppliersTable';
import { Supplier } from '@/types';
import { toast } from 'sonner';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    const term = searchTerm.toLowerCase();
    return suppliers.filter(s =>
      s.fiscalName.toLowerCase().includes(term) ||
      s.commercialName?.toLowerCase().includes(term) ||
      s.taxId.toLowerCase().includes(term) ||
      s.phone.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleEdit = () => {
    if (!selectedSupplier) { toast.error('Selecciona un proveedor para editar'); return; }
    openEdit(selectedSupplier);
  };

  const handleDelete = () => {
    if (!selectedSupplier) { toast.error('Selecciona un proveedor para borrar'); return; }
    if (!confirm(`¿Estás seguro de eliminar el proveedor "${selectedSupplier.fiscalName}"?`)) return;
    deleteSupplier(selectedSupplier.id);
    setSelectedSupplier(null);
  };

  const handleSave = (data: Omit<Supplier, 'id' | 'createdAt'>) => {
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, data);
    } else {
      addSupplier(data);
    }
    setIsDialogOpen(false);
    setEditingSupplier(null);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <SuppliersToolbar
        searchTerm={searchTerm}
        hasSelection={!!selectedSupplier}
        onSearchChange={setSearchTerm}
        onNew={() => { setEditingSupplier(null); setIsDialogOpen(true); }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <SuppliersTable
        suppliers={filteredSuppliers}
        selectedId={selectedSupplier?.id ?? null}
        searchTerm={searchTerm}
        onSelect={setSelectedSupplier}
        onDoubleClick={openEdit}
        onNew={() => { setEditingSupplier(null); setIsDialogOpen(true); }}
        onClearSearch={() => setSearchTerm('')}
      />

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
