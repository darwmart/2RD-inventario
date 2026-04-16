import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Supplier } from '@/types';
import { Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type SupplierFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  existingSuppliers?: Supplier[];
  onSave: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
};

// Modal de formulario de proveedor - inspirado en interfaz de gestión comercial
export default function SupplierFormDialog({ open, onOpenChange, supplier, existingSuppliers = [], onSave }: SupplierFormDialogProps) {
  // Estado del formulario
  const [taxIdType, setTaxIdType] = useState('N.I.T.');
  const [taxId, setTaxId] = useState('');
  const [fiscalName, setFiscalName] = useState('');
  const [commercialName, setCommercialName] = useState('');

  // Domicilio
  const [address, setAddress] = useState('');

  // Contacto
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Datos bancarios
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('Ahorros');
  const [bankName, setBankName] = useState('');

  // Otros
  const [isProvider, setIsProvider] = useState(true);
  const [isCreditor, setIsCreditor] = useState(false);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (supplier) {
      setTaxIdType(supplier.taxIdType);
      setTaxId(supplier.taxId);
      setFiscalName(supplier.fiscalName);
      setCommercialName(supplier.commercialName || '');
      setAddress(supplier.address);
      setPhone(supplier.phone);
      setMobile(supplier.mobile || '');
      setContactPerson(supplier.contactPerson || '');
      setAccountNumber(supplier.iban || ''); // Reutilizando el campo iban como número de cuenta
      setAccountType('Ahorros');
      setBankName(supplier.bankName || '');
      setIsProvider(supplier.isProvider !== false);
      setIsCreditor(supplier.isCreditor || false);
    } else {
      // Limpiar formulario
      resetForm();
    }
  }, [supplier]);

  const resetForm = () => {
    setTaxIdType('N.I.T.');
    setTaxId('');
    setFiscalName('');
    setCommercialName('');
    setAddress('');
    setPhone('');
    setMobile('');
    setContactPerson('');
    setAccountNumber('');
    setAccountType('Ahorros');
    setBankName('');
    setIsProvider(true);
    setIsCreditor(false);
  };

  const handleSave = () => {
    // Validaciones básicas
    if (!fiscalName.trim()) {
      toast.error('El nombre fiscal es obligatorio');
      return;
    }

    if (!taxId.trim()) {
      toast.error('La identificación fiscal es obligatoria');
      return;
    }

    // NIT duplicado
    const dup = existingSuppliers.find(s =>
      s.taxId === taxId.trim() && s.id !== supplier?.id
    );
    if (dup) {
      toast.error(`Ya existe un proveedor con la identificación ${taxId.trim()} (${dup.fiscalName})`);
      return;
    }

    if (!phone.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }

    // Formato teléfono (solo dígitos, 7-15 caracteres)
    if (!/^\d{7,15}$/.test(phone.trim())) {
      toast.error('El teléfono debe contener solo dígitos (7-15 caracteres)');
      return;
    }

    const supplierData: Omit<Supplier, 'id' | 'createdAt'> = {
      code: supplier?.code, // Mantener el código existente al editar, se generará automáticamente al crear
      taxIdType,
      taxId,
      fiscalName,
      commercialName,
      address,
      phone,
      mobile,
      contactPerson,
      email: '', // Campo vacío por defecto
      iban: accountNumber, // Guardando número de cuenta en iban
      bankName,
      isProvider,
      isCreditor,
    };

    onSave(supplierData);
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-4 pb-2 border-b bg-gray-50">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {supplier ? `Editar Proveedor - ${supplier.fiscalName}` : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Código</Label>
                  <Input
                    value={supplier?.code || 'Autogenerado'}
                    disabled
                    className="h-9 bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Consecutivo automático</p>
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={isProvider}
                      onChange={() => {
                        setIsProvider(true);
                        setIsCreditor(false);
                      }}
                    />
                    Proveedor
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={isCreditor}
                      onChange={() => {
                        setIsProvider(false);
                        setIsCreditor(true);
                      }}
                    />
                    Acreedor
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-medium">Identificación fiscal *</Label>
                  <Select value={taxIdType} onValueChange={setTaxIdType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N.I.T.">N.I.T.</SelectItem>
                      <SelectItem value="C.C.">C.C.</SelectItem>
                      <SelectItem value="C.E.">C.E.</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs font-medium">&nbsp;</Label>
                  <Input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Número de identificación"
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Nombre fiscal *</Label>
                <Input
                  value={fiscalName}
                  onChange={(e) => setFiscalName(e.target.value)}
                  placeholder="Nombre legal del proveedor"
                  className="h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Nombre comercial</Label>
                <Input
                  value={commercialName}
                  onChange={(e) => setCommercialName(e.target.value)}
                  placeholder="Nombre comercial (opcional)"
                  className="h-9"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Domicilio</h3>
                <div>
                  <Label className="text-xs font-medium">Dirección</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, ciudad..."
                    className="h-9"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Teléfono *</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Móvil</Label>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">Persona de contacto</Label>
                    <Input
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Datos bancarios</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Número de cuenta</Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Número de cuenta bancaria"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Tipo de cuenta</Label>
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ahorros">Ahorros</SelectItem>
                        <SelectItem value="Corriente">Corriente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">Banco</Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Nombre del banco"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 px-6 py-3 border-t bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {supplier ? 'Guardar cambios' : 'Guardar y nuevo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
