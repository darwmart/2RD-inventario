import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Product, Category, Supplier } from '@/types';
import { Save, Package, Plus, FolderPlus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ImageUploader from '@/components/ImageUploader';

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  existingProducts?: Product[];
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'reservedStock'>) => void;
  onAddCategory?: (name: string, description: string) => void;
};

// Modal de formulario de artículo - estilo FactuSOL
export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  suppliers,
  existingProducts = [],
  onSave,
  onAddCategory
}: ProductFormDialogProps) {
  // Ficha
  const [reference, setReference] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [hasIva, setHasIva] = useState(true);

  // Estados para modal de crear categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  // Precios
  const [cost, setCost] = useState(0);
  const [costStr, setCostStr] = useState('');
  const fmtMoneyInput = (s: string) => { const raw = s.replace(/\D/g, ''); return raw === '' ? '' : raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  // Márgenes de ganancia (%)
  const [marginSuggested, setMarginSuggested] = useState(0);
  const [marginCurrent, setMarginCurrent] = useState(0);
  const [marginDiscount, setMarginDiscount] = useState(0);
  const [marginWholesale, setMarginWholesale] = useState(0);

  // Precios calculados
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);

  // Información de stock
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(1);

  // Otros
  const [image, setImage] = useState('');

  // Estados para modal de edición de tarifa
  const [editingTariff, setEditingTariff] = useState<'suggested' | 'current' | 'discount' | 'wholesale' | null>(null);
  const [tempMargin, setTempMargin] = useState(0);
  const [tempPrice, setTempPrice] = useState(0);
  const [tempPriceStr, setTempPriceStr] = useState('');

  // Porcentaje de IVA
  const IVA_PERCENTAGE = 19;

  // Calcular precio basado en costo y margen (incluye IVA si aplica)
  const calculatePrice = (baseCost: number, margin: number): number => {
    if (baseCost <= 0 || margin === 0) return 0;
    return baseCost * (1 + margin / 100);
  };

  // Calcular margen basado en costo y precio
  const calculateMargin = (baseCost: number, price: number): number => {
    if (baseCost <= 0 || price <= 0) return 0;
    return ((price - baseCost) / baseCost) * 100;
  };

  // Calcular margen real (descontando el IVA del precio si aplica)
  const calculateRealMargin = (baseCost: number, priceWithIva: number, includesIva: boolean): number => {
    if (baseCost <= 0 || priceWithIva <= 0) return 0;

    if (includesIva) {
      // Si el precio incluye IVA, primero lo quitamos para obtener el precio base
      const priceWithoutIva = priceWithIva / (1 + IVA_PERCENTAGE / 100);
      return ((priceWithoutIva - baseCost) / baseCost) * 100;
    }

    // Si no incluye IVA, el margen es directo
    return ((priceWithIva - baseCost) / baseCost) * 100;
  };

  // Recalcular precios cuando cambia el costo o los márgenes
  useEffect(() => {
    setSuggestedPrice(calculatePrice(cost, marginSuggested));
  }, [cost, marginSuggested]);

  useEffect(() => {
    setCurrentPrice(calculatePrice(cost, marginCurrent));
  }, [cost, marginCurrent]);

  useEffect(() => {
    setDiscountPrice(calculatePrice(cost, marginDiscount));
  }, [cost, marginDiscount]);

  useEffect(() => {
    setWholesalePrice(calculatePrice(cost, marginWholesale));
  }, [cost, marginWholesale]);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (product) {
      setReference(product.reference);
      setBarcode(product.barcode);
      setCategoryId(product.categoryId);
      setName(product.name);
      setDescription(product.description);
      setSupplierId(product.supplierId || '');
      setHasIva(product.hasIva);
      setCost(product.cost);
      setCostStr(product.cost ? Math.round(product.cost).toLocaleString('es-CO') : '');

      // Calcular márgenes basados en precios existentes
      setMarginSuggested(calculateMargin(product.cost, product.suggestedPrice));
      setMarginCurrent(calculateMargin(product.cost, product.currentPrice));
      setMarginDiscount(calculateMargin(product.cost, product.discountPrice));
      setMarginWholesale(calculateMargin(product.cost, product.wholesalePrice));

      setSuggestedPrice(product.suggestedPrice);
      setCurrentPrice(product.currentPrice);
      setDiscountPrice(product.discountPrice);
      setWholesalePrice(product.wholesalePrice);
      setStock(product.stock);
      setMinStock(product.minStock);
      setImage(product.image || '');
    } else {
      resetForm();
    }
  }, [product]);

  const resetForm = () => {
    setReference('');
    setBarcode('');
    setCategoryId('');
    setName('');
    setDescription('');
    setSupplierId('');
    setHasIva(true);
    setCost(0);
    setCostStr('');
    setMarginSuggested(0);
    setMarginCurrent(0);
    setMarginDiscount(0);
    setMarginWholesale(0);
    setSuggestedPrice(0);
    setCurrentPrice(0);
    setDiscountPrice(0);
    setWholesalePrice(0);
    setStock(0);
    setMinStock(1);
    setImage('');
  };

  // Abrir modal de edición de tarifa
  const openTariffEditor = (tariff: 'suggested' | 'current' | 'discount' | 'wholesale') => {
    const margins = {
      suggested: marginSuggested,
      current: marginCurrent,
      discount: marginDiscount,
      wholesale: marginWholesale
    };
    const prices = {
      suggested: suggestedPrice,
      current: currentPrice,
      discount: discountPrice,
      wholesale: wholesalePrice
    };
    setTempMargin(margins[tariff]);
    setTempPrice(prices[tariff]);
    setTempPriceStr(prices[tariff] ? Math.round(prices[tariff]).toLocaleString('es-CO') : '');
    setEditingTariff(tariff);
  };

  // Aplicar cambios del margen
  const applyTariffMargin = () => {
    if (editingTariff === 'suggested') setMarginSuggested(tempMargin);
    else if (editingTariff === 'current') setMarginCurrent(tempMargin);
    else if (editingTariff === 'discount') setMarginDiscount(tempMargin);
    else if (editingTariff === 'wholesale') setMarginWholesale(tempMargin);
    setEditingTariff(null);
  };

  // Manejar cambio de margen en el modal
  const handleTempMarginChange = (newMargin: number) => {
    setTempMargin(newMargin);
    const newPrice = calculatePrice(cost, newMargin);
    setTempPrice(newPrice);
    setTempPriceStr(newPrice ? Math.round(newPrice).toLocaleString('es-CO') : '');
  };

  // Manejar cambio de precio en el modal
  const handleTempPriceChange = (newPrice: number) => {
    setTempPrice(newPrice);
    setTempMargin(calculateMargin(cost, newPrice));
  };

  // Manejar creación de nueva categoría
  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    if (onAddCategory) {
      onAddCategory(newCategoryName.trim(), newCategoryDescription.trim());
      toast.success('Categoría creada correctamente');
      setNewCategoryName('');
      setNewCategoryDescription('');
      setIsCategoryModalOpen(false);
    }
  };

  const handleSave = () => {
    // Validaciones básicas
    if (!reference.trim()) {
      toast.error('El código de artículo es obligatorio');
      return;
    }

    if (!name.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    if (!categoryId) {
      toast.error('La familia es obligatoria');
      return;
    }

    // Referencia duplicada
    const dupRef = existingProducts.find(p =>
      p.reference.trim().toLowerCase() === reference.trim().toLowerCase() &&
      p.id !== product?.id
    );
    if (dupRef) {
      toast.error(`Ya existe un artículo con el código "${reference}" (${dupRef.name})`);
      return;
    }

    // Código de barras duplicado (solo si se ingresó)
    if (barcode.trim()) {
      const dupBarcode = existingProducts.find(p =>
        p.barcode?.trim() === barcode.trim() &&
        p.id !== product?.id
      );
      if (dupBarcode) {
        toast.error(`Ya existe un artículo con el código de barras "${barcode}" (${dupBarcode.name})`);
        return;
      }
    }

    // Precio de venta no puede ser menor al costo
    if (cost > 0 && currentPrice > 0 && currentPrice < cost) {
      toast.error('El precio de venta no puede ser menor al costo');
      return;
    }

    // Stock no puede ser negativo
    if (stock < 0) {
      toast.error('El stock no puede ser negativo');
      return;
    }

    const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'reservedStock'> = {
      reference,
      barcode,
      categoryId,
      name,
      description,
      supplierId,
      hasIva,
      cost,
      suggestedPrice,
      currentPrice,
      discountPrice,
      wholesalePrice,
      stock,
      minStock,
      image
    };

    onSave(productData);
    onOpenChange(false);
    resetForm();
  };

  // ── EAN-13 ────────────────────────────────────────────────────────────────

  const calcEan13Check = (digits12: string): number => {
    const d = digits12.split('').map(Number);
    const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10;
  };

  const validateEan13 = (code: string): boolean => {
    if (!/^\d{13}$/.test(code)) return false;
    return calcEan13Check(code.slice(0, 12)) === Number(code[12]);
  };

  const generateEan13 = () => {
    // Prefijo Colombia 770 + 9 dígitos basados en timestamp
    const base = '770' + String(Date.now()).slice(-9);
    const check = calcEan13Check(base);
    setBarcode(base + check);
  };

  const barcodeStatus = (() => {
    if (!barcode) return null;
    if (barcode.length === 13) return validateEan13(barcode) ? 'valid' : 'invalid';
    if (/^\d+$/.test(barcode) && barcode.length < 13) return 'incomplete';
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-4 pb-2 border-b bg-gray-50">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product ? `Editar Artículo - ${product.name}` : 'Nuevo Artículo'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-4">
            {/* Ficha */}
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Ficha</h3>
                <ImageUploader value={image} onChange={setImage} productName={name || 'Nuevo artículo'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Código de artículo *</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej: ART-001"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Código de barras</Label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Input
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value.replace(/\D/g, '').slice(0, 13))}
                        placeholder="EAN-13 (13 dígitos)"
                        className={`h-9 pr-7 font-mono ${
                          barcodeStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-400' :
                          barcodeStatus === 'invalid' ? 'border-red-400 focus-visible:ring-red-400' : ''
                        }`}
                        maxLength={13}
                      />
                      {barcodeStatus === 'valid' && (
                        <CheckCircle className="absolute right-2 top-2.5 h-4 w-4 text-green-500 pointer-events-none" />
                      )}
                      {barcodeStatus === 'invalid' && (
                        <XCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-400 pointer-events-none" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateEan13}
                      className="h-9 px-2 shrink-0"
                      title="Generar EAN-13 automático (prefijo Colombia 770)"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {barcodeStatus === 'invalid' && (
                    <p className="text-xs text-red-500 mt-0.5">Dígito verificador incorrecto</p>
                  )}
                  {barcodeStatus === 'incomplete' && (
                    <p className="text-xs text-gray-400 mt-0.5">{barcode.length}/13 dígitos</p>
                  )}
                  {barcodeStatus === 'valid' && (
                    <p className="text-xs text-green-600 mt-0.5">EAN-13 válido</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-medium">Familia *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Nueva
                    </Button>
                  </div>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccione familia" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Proveedor</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccione proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.fiscalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium">Descripción *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del artículo"
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium">Observaciones</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Información adicional del artículo"
                    className="min-h-[60px]"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Tipo de IVA</Label>
                  <Select
                    value={hasIva ? 'con-iva' : 'sin-iva'}
                    onValueChange={(value) => setHasIva(value === 'con-iva')}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="con-iva">General (19%)</SelectItem>
                      <SelectItem value="sin-iva">Exento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Precios */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Precios</h3>

              {/* Precio de Costo */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Precio de costo *</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={costStr}
                      onChange={(e) => { const f = fmtMoneyInput(e.target.value); setCostStr(f); setCost(f === '' ? 0 : parseInt(f.replace(/\./g, ''), 10)); }}
                      placeholder=""
                      className="h-9"
                    />
                  </div>
                  {hasIva && (
                    <div>
                      <Label className="text-xs font-medium">Costo + IVA (19%)</Label>
                      <div className="h-9 px-3 py-2 bg-gray-50 rounded border font-mono text-sm">
                        ${(cost * (1 + IVA_PERCENTAGE / 100)).toLocaleString('es-CO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de Tarifas */}
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium border-b">Tarifa/Nombre</th>
                      <th className="text-right p-2 font-medium border-b w-24">P.Costo</th>
                      <th className="text-right p-2 font-medium border-b w-24">Margen %</th>
                      <th className="text-right p-2 font-medium border-b w-24">Mar. Real</th>
                      <th className="text-right p-2 font-medium border-b w-32">P.Venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Tarifa Sugerido */}
                    <tr
                      className="border-b hover:bg-blue-50 cursor-pointer"
                      onClick={() => openTariffEditor('suggested')}
                    >
                      <td className="p-2">1 Precio Sugerido</td>
                      <td className="p-2 text-right font-mono text-xs">
                        ${(hasIva ? cost * (1 + IVA_PERCENTAGE / 100) : cost).toLocaleString('es-CO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {marginSuggested.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-gray-600">
                        {calculateRealMargin(cost, suggestedPrice, hasIva).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-medium">
                        ${suggestedPrice.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Tarifa Actual */}
                    <tr
                      className="border-b hover:bg-blue-50 cursor-pointer bg-blue-50"
                      onClick={() => openTariffEditor('current')}
                    >
                      <td className="p-2 font-medium">2 Precio Actual (Principal)</td>
                      <td className="p-2 text-right font-mono text-xs">
                        ${(hasIva ? cost * (1 + IVA_PERCENTAGE / 100) : cost).toLocaleString('es-CO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {marginCurrent.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-blue-600 font-medium">
                        {calculateRealMargin(cost, currentPrice, hasIva).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-bold text-blue-700">
                        ${currentPrice.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Tarifa Descuento */}
                    <tr
                      className="border-b hover:bg-blue-50 cursor-pointer"
                      onClick={() => openTariffEditor('discount')}
                    >
                      <td className="p-2">3 Precio con Descuento</td>
                      <td className="p-2 text-right font-mono text-xs">
                        ${(hasIva ? cost * (1 + IVA_PERCENTAGE / 100) : cost).toLocaleString('es-CO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {marginDiscount.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-gray-600">
                        {calculateRealMargin(cost, discountPrice, hasIva).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-medium">
                        ${discountPrice.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Tarifa Mayorista */}
                    <tr
                      className="hover:bg-blue-50 cursor-pointer"
                      onClick={() => openTariffEditor('wholesale')}
                    >
                      <td className="p-2">4 Precio Mayorista</td>
                      <td className="p-2 text-right font-mono text-xs">
                        ${(hasIva ? cost * (1 + IVA_PERCENTAGE / 100) : cost).toLocaleString('es-CO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {marginWholesale.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-gray-600">
                        {calculateRealMargin(cost, wholesalePrice, hasIva).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-medium">
                        ${wholesalePrice.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  💡 <strong>Margen ingresado:</strong> Precio = Costo × (1 + Margen/100)
                </p>
                {hasIva && (
                  <p className="text-xs text-blue-600">
                    ℹ️ <strong>Margen Real:</strong> Descuenta el IVA (19%) del precio para mostrar el margen real sobre el costo
                  </p>
                )}
              </div>
            </div>

            {/* Información de stock */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Información de stock</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Stock actual</Label>
                  <Input
                    type="number"
                    value={stock || ''}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Stock mínimo</Label>
                  <Input
                    type="number"
                    value={minStock || ''}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 1)}
                    placeholder="1"
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
            {product ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>

      {/* Modal de Edición de Tarifa */}
      <Dialog open={!!editingTariff} onOpenChange={(open) => !open && setEditingTariff(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingTariff === 'suggested' && 'Precio Sugerido'}
              {editingTariff === 'current' && 'Precio Actual (Principal)'}
              {editingTariff === 'discount' && 'Precio con Descuento'}
              {editingTariff === 'wholesale' && 'Precio Mayorista'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Campo de Margen */}
            <div>
              <Label className="text-sm font-medium">Margen %:</Label>
              <Input
                type="number"
                value={tempMargin || ''}
                onChange={(e) => handleTempMarginChange(parseFloat(e.target.value) || 0)}
                className="mt-1"
                step="0.01"
                autoFocus
              />
            </div>

            {/* Precio de Venta Editable */}
            <div>
              <Label className="text-sm font-medium">Precio de venta:</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={tempPriceStr}
                onChange={(e) => { const f = fmtMoneyInput(e.target.value); setTempPriceStr(f); handleTempPriceChange(f === '' ? 0 : parseInt(f.replace(/\./g, ''), 10)); }}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Edita el precio o el margen - se calculan automáticamente
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setEditingTariff(null)}>
              Cancelar
            </Button>
            <Button onClick={applyTariffMargin}>
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Crear Categoría */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Nueva Familia/Categoría
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Accesorios, Ropa deportiva..."
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCategory();
                  }
                }}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Descripción (opcional)</Label>
              <Textarea
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Describe brevemente esta categoría..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCategoryModalOpen(false);
                setNewCategoryName('');
                setNewCategoryDescription('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
