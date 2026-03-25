# Configuración de Supabase Storage para Imágenes

## 1. Crear un proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté completamente configurado

## 2. Configurar Storage

1. En el panel de Supabase, ve a **Storage** en el menú lateral
2. Crea un nuevo bucket llamado `product-images`
3. Configuración del bucket:
   - **Nombre**: `product-images`
   - **Público**: ✅ Activado (para permitir acceso público a las imágenes)
   - **Allowed MIME types**: `image/*`
   - **Max file size**: `5MB`

## 3. Configurar políticas de Storage (RLS)

Ve a la sección de **Policies** del bucket `product-images` y crea las siguientes políticas:

### Política de lectura (SELECT)
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );
```

### Política de inserción (INSERT)
```sql
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);
```

O si quieres permitir subidas anónimas (no recomendado para producción):
```sql
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );
```

### Política de actualización (UPDATE)
```sql
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-images' );
```

### Política de eliminación (DELETE)
```sql
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-images' );
```

## 4. Obtener las credenciales

1. Ve a **Settings** > **API** en tu proyecto de Supabase
2. Copia los siguientes valores:
   - **Project URL**: Esta es tu `VITE_SUPABASE_URL`
   - **anon public**: Esta es tu `VITE_SUPABASE_ANON_KEY`

## 5. Configurar variables de entorno

1. Crea un archivo `.env` en la raíz del proyecto (copia `.env.example`)
2. Agrega las credenciales:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
   ```

## 6. Alternativa: Almacenamiento Local (Base64)

Si no quieres usar Supabase Storage, el componente `ImageUploader` está configurado por defecto para convertir las imágenes a Base64 y almacenarlas directamente en la base de datos local.

**Ventajas**:
- No requiere configuración adicional
- Funciona sin conexión a internet
- No hay costos adicionales

**Desventajas**:
- Aumenta el tamaño de la base de datos
- Puede afectar el rendimiento con muchas imágenes
- Límite de tamaño de imagen más restrictivo

Para usar Base64, simplemente no configures las variables de entorno de Supabase.

## 7. Cambiar entre almacenamiento local y Supabase

En el archivo `src/components/ImageUploader.tsx`, busca la función `handleFileUpload`:

```typescript
// Opción 1: Subir a Supabase (requiere configuración)
const imageUrl = await uploadProductImage(file);
onChange(imageUrl);

// Opción 2: Convertir a Base64 (almacenamiento local) - ACTUALMENTE ACTIVA
const reader = new FileReader();
reader.onloadend = () => {
  const base64String = reader.result as string;
  onChange(base64String);
};
reader.readAsDataURL(file);
```

Comenta/descomenta según necesites.
