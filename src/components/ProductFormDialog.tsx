import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Category, Supplier } from '@/types';

interface ProductFormData {
  name: string;
  barcode: string;
  reference: string;
  description: string;
  image: string;
  cost: number;
  suggestedPrice: number;
  discountPrice: number;
  wholesalePrice: number;
  currentPrice: number;
  stock: number;
  minStock: number;
  categoryId: string;
  supplierId: string;
  hasIva: boolean;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: ProductFormData;
  onFormChange: (data: ProductFormData) => void;
  onSubmit: () => void;
  categories: Category[];
  suppliers: Supplier[];
  submitLabel?: string;
  title?: string;
  onAddCategory?: (name: string) => void;
  onAddSupplier?: (supplier: { name: string; contact: string; phone: string; email: string; address: string }) => void;
  showCategoryCreate?: boolean;
  showSupplierCreate?: boolean;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  categories,
  suppliers,
  submitLabel = 'Crear Producto',
  title = 'Crear Nuevo Producto',
  onAddCategory,
  onAddSupplier,
  showCategoryCreate = false,
  showSupplierCreate = false
}: ProductFormDialogProps) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleAddCategory = () => {
    if (newCategory.trim() && onAddCategory) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
      setIsCreatingCategory(false);
    }
  };

  const handleAddSupplier = () => {
    if (newSupplier.name.trim() && onAddSupplier) {
      onAddSupplier(newSupplier);
      setNewSupplier({
        name: '',
        contact: '',
        phone: '',
        email: '',
        address: ''
      });
      setIsCreatingSupplier(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={formData.name}
              onChange={(e) => onFormChange({...formData, name: e.target.value})}
              placeholder="Nombre del producto"
            />
          </div>
          <div>
            <Label>Referencia *</Label>
            <Input
              value={formData.reference}
              onChange={(e) => onFormChange({...formData, reference: e.target.value})}
              placeholder="REF-001"
            />
          </div>
          <div>
            <Label>Código de Barras</Label>
            <Input
              value={formData.barcode}
              onChange={(e) => onFormChange({...formData, barcode: e.target.value})}
              placeholder="123456789"
            />
          </div>
          <div>
            <Label>Categoría *</Label>
            <div className="flex gap-2">
              <Select
                value={formData.categoryId}
                onValueChange={(value) => onFormChange({...formData, categoryId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCategoryCreate && (
                <Dialog open={isCreatingCategory} onOpenChange={setIsCreatingCategory}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button">+</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Categoría</DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre de la categoría"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                        }}
                      />
                      <Button onClick={handleAddCategory}>Agregar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <div>
            <Label>Proveedor *</Label>
            <div className="flex gap-2">
              <Select
                value={formData.supplierId}
                onValueChange={(value) => onFormChange({...formData, supplierId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showSupplierCreate && (
                <Dialog open={isCreatingSupplier} onOpenChange={setIsCreatingSupplier}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button">+</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Proveedor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Nombre del proveedor"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                      />
                      <Input
                        placeholder="Contacto"
                        value={newSupplier.contact}
                        onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                      />
                      <Input
                        placeholder="Teléfono"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                      />
                      <Input
                        placeholder="Email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                      />
                      <Textarea
                        placeholder="Dirección"
                        value={newSupplier.address}
                        onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                      />
                      <Button onClick={handleAddSupplier}>Agregar Proveedor</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <div>
            <Label>Costo</Label>
            <Input
              type="number"
              value={formData.cost || ''}
              onChange={(e) => onFormChange({...formData, cost: parseFloat(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Precio Sugerido</Label>
            <Input
              type="number"
              value={formData.suggestedPrice || ''}
              onChange={(e) => onFormChange({...formData, suggestedPrice: parseFloat(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Precio de Descuento</Label>
            <Input
              type="number"
              value={formData.discountPrice || ''}
              onChange={(e) => onFormChange({...formData, discountPrice: parseFloat(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Precio por Mayor</Label>
            <Input
              type="number"
              value={formData.wholesalePrice || ''}
              onChange={(e) => onFormChange({...formData, wholesalePrice: parseFloat(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Precio de Venta Actual</Label>
            <Input
              type="number"
              value={formData.currentPrice || ''}
              onChange={(e) => onFormChange({...formData, currentPrice: parseFloat(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
          <div>
            <Label>URL de Imagen</Label>
            <Input
              value={formData.image}
              onChange={(e) => onFormChange({...formData, image: e.target.value})}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Stock Inicial</Label>
            <Input
              type="number"
              value={formData.stock || ''}
              onChange={(e) => onFormChange({...formData, stock: parseInt(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Stock Mínimo</Label>
            <Input
              type="number"
              value={formData.minStock || ''}
              onChange={(e) => onFormChange({...formData, minStock: parseInt(e.target.value) || 1})}
              placeholder="1"
            />
          </div>
          <div className="col-span-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => onFormChange({...formData, description: e.target.value})}
              placeholder="Descripción del producto"
              rows={2}
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium text-sm">Precio incluye IVA</Label>
                <p className="text-xs text-gray-600">El precio ya tiene el IVA incluido</p>
              </div>
              <Switch
                checked={formData.hasIva}
                onCheckedChange={(checked) => onFormChange({...formData, hasIva: checked})}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
