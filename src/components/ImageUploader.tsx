import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Link as LinkIcon, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { uploadProductImage } from '@/lib/supabase';

type ImageUploaderProps = {
  value: string;
  onChange: (url: string) => void;
  productName?: string;
};

export default function ImageUploader({ value, onChange, productName }: ImageUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState('url');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Manejar subida de archivo
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Opción 1: Subir a Supabase (requiere configuración)
      // const imageUrl = await uploadProductImage(file);

      // Opción 2: Convertir a Base64 (para almacenamiento local)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        toast.success('Imagen cargada correctamente');
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error al cargar imagen:', error);
      toast.error('Error al cargar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  // Manejar clic en botón de archivo
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Manejar clic en botón de cámara
  const handleCameraButtonClick = () => {
    cameraInputRef.current?.click();
  };

  // Manejar cambio en input de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Manejar URL
  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error('Ingrese una URL válida');
      return;
    }

    // Validar que sea una URL de imagen
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const isValidImageUrl = imageExtensions.some(ext =>
      urlInput.toLowerCase().includes(ext)
    ) || urlInput.includes('unsplash') || urlInput.includes('imgur') || urlInput.includes('cloudinary');

    if (!isValidImageUrl) {
      toast.warning('Asegúrese de que la URL sea de una imagen válida');
    }

    onChange(urlInput);
    setUrlInput('');
    toast.success('URL de imagen guardada');
  };

  // Eliminar imagen
  const handleRemoveImage = () => {
    onChange('');
    setUrlInput('');
    toast.success('Imagen eliminada');
  };

  return (
    <>
      {/* Botón/Ícono para abrir modal */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9"
        title="Gestionar imagen del producto"
      >
        <ImageIcon className={`h-4 w-4 ${value ? 'text-blue-600' : 'text-gray-400'}`} />
      </Button>

      {/* Modal de gestión de imagen */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Imagen del Artículo
            </DialogTitle>
            {productName && (
              <p className="text-sm text-gray-600 mt-1">{productName}</p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vista previa de la imagen */}
            {value ? (
              <div className="relative">
                <img
                  src={value}
                  alt="Vista previa"
                  className="w-full max-h-[300px] object-contain rounded-lg border-2 border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Error+al+cargar';
                    toast.error('Error al cargar la imagen');
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="text-center text-gray-400">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Sin imagen</p>
                </div>
              </div>
            )}

            {/* Tabs para diferentes métodos de carga */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url" className="text-xs">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="file" className="text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  Archivo
                </TabsTrigger>
                <TabsTrigger value="camera" className="text-xs">
                  <Camera className="h-3 w-3 mr-1" />
                  Cámara
                </TabsTrigger>
              </TabsList>

              {/* URL */}
              <TabsContent value="url" className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="h-9"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUrlSubmit();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="h-9"
                  >
                    Agregar
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Ingrese la URL de una imagen desde internet
                </p>
              </TabsContent>

              {/* Archivo */}
              <TabsContent value="file" className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={handleFileButtonClick}
                  disabled={isUploading}
                  className="w-full h-20 border-2 border-dashed"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">
                      {isUploading ? 'Subiendo...' : 'Seleccionar archivo'}
                    </span>
                  </div>
                </Button>
                <p className="text-xs text-gray-500">
                  Formatos: JPG, PNG, GIF, WebP (máx. 5MB)
                </p>
              </TabsContent>

              {/* Cámara */}
              <TabsContent value="camera" className="space-y-2">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={handleCameraButtonClick}
                  disabled={isUploading}
                  className="w-full h-20 border-2 border-dashed"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-6 w-6" />
                    <span className="text-sm">
                      {isUploading ? 'Capturando...' : 'Tomar foto'}
                    </span>
                  </div>
                </Button>
                <p className="text-xs text-gray-500">
                  Usa la cámara de tu dispositivo para capturar una imagen
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
