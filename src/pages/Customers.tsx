import { useState, useMemo } from 'react';
import { useCustomersQuery } from '@/hooks/queries';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import CustomerStatsCards from '@/components/customers/CustomerStatsCards';
import CustomerTable from '@/components/customers/CustomerTable';
import CustomerFormDialog, { CustomerFormData } from '@/components/customers/CustomerFormDialog';
import CustomerHistoryDialog from '@/components/customers/CustomerHistoryDialog';

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomersQuery();

  const [searchTerm, setSearchTerm]         = useState('');
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [isHistoryOpen, setIsHistoryOpen]   = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.document ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    );
  }, [customers, searchTerm]);

  const stats = useMemo(() => ({
    total:        customers.length,
    active:       customers.filter(c => c.isActive).length,
    totalBalance: customers.reduce((sum, c) => sum + (c.balance ?? 0), 0),
  }), [customers]);

  const openNew  = () => { setEditingCustomer(null); setIsFormOpen(true); };
  const openEdit = (c: Customer) => { setEditingCustomer(c); setIsFormOpen(true); };
  const openHistory = (c: Customer) => { setSelectedCustomer(c); setIsHistoryOpen(true); };

  const handleSave = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, data);
    } else {
      addCustomer(data);
    }
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = (customer: Customer) => {
    if (!confirm(`¿Eliminar al cliente "${customer.name}"?`)) return;
    deleteCustomer(customer.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de clientes y su historial de compras</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </Button>
      </div>

      <CustomerStatsCards
        totalCustomers={stats.total}
        activeCustomers={stats.active}
        totalBalance={stats.totalBalance}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, documento o teléfono..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <CustomerTable
        customers={filtered}
        onEdit={openEdit}
        onDelete={handleDelete}
        onHistory={openHistory}
      />

      <CustomerFormDialog
        open={isFormOpen}
        editingCustomer={editingCustomer}
        customers={customers}
        onClose={() => { setIsFormOpen(false); setEditingCustomer(null); }}
        onSave={handleSave}
      />

      <CustomerHistoryDialog
        open={isHistoryOpen}
        customer={selectedCustomer}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
