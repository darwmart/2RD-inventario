# Datos de Prueba - Productos FactuSOL

## Descripción

Este proyecto incluye **254 productos reales** extraídos de la base de datos FactuSOL (2RD2024.MDB) listos para importar y realizar pruebas en el sistema.

## Productos Incluidos

### Resumen
- **Total de productos**: 254
- **Categorías**: 9
- **Precios**: Configurados en pesos colombianos
- **Stock inicial**: Variable por producto
- **Códigos de barras**: Generados automáticamente

### Categorías Incluidas

1. **Ropa y Protección** (9 productos)
   - Chalecos, cortavientos, impermeables, chaquetas

2. **Luces y Exploradoras** (36 productos)
   - Exploradoras LED, direccionales, farolas

3. **Accesorios** (46 productos)
   - Dry bags, cúpulas, parrillas, guarda barros, gafas cross, etc.

4. **Cascos** (8 productos)
   - Cascos integrales, cross, abiertos

5. **Electrónica** (7 productos)
   - Cargadores USB, fusibles, intercomunicadores

6. **Guantes** (36 productos)
   - Guantes de cuero, impermeables, cross, para bicicleta

7. **Defensas** (87 productos)
   - Defensas para múltiples modelos de motos (BWS, FZ, CB, Pulsar, etc.)

8. **Espejos** (30 productos)
   - Espejos universales y específicos por modelo

9. **Servicios** (1 producto)
   - Fletes

## Cómo Importar los Datos

### Opción 1: Desde la Interfaz (Recomendado)

1. Abre el sistema
2. Ve a **Configuración** (icono de engranaje en el menú)
3. Selecciona la sección **"Datos de Prueba"** en el menú lateral
4. Haz clic en el botón **"Importar Datos de Prueba"**
5. Confirma la operación
6. El sistema se recargará automáticamente con los nuevos datos

### Opción 2: Desde la Consola del Navegador

1. Abre las herramientas de desarrollo del navegador (F12)
2. Ve a la pestaña "Console"
3. Ejecuta el siguiente comando:
   ```javascript
   importSampleData()
   ```
4. Recarga la página

## Estructura de los Datos

Cada producto incluye:

```typescript
{
  reference: string,      // Código de referencia (ej: "CH001")
  barcode: string,        // Código de barras EAN-13
  name: string,          // Nombre del producto
  categoryName: string,  // Nombre de la categoría
  cost: number,          // Costo del producto
  currentPrice: number,  // Precio de venta actual
  stock: number          // Stock inicial
}
```

Los precios adicionales se calculan automáticamente:
- **Precio Sugerido**: +15% del precio actual
- **Precio con Descuento**: -10% del precio actual
- **Precio Mayorista**: -15% del precio actual

## Eliminar Datos

Si deseas eliminar TODOS los datos del sistema:

1. Ve a **Configuración** > **Datos de Prueba**
2. En la sección "Zona de Peligro"
3. Haz clic en **"Eliminar Todos los Datos"**
4. Confirma la operación

**⚠️ ADVERTENCIA**: Esta acción eliminará:
- Todos los productos
- Todas las categorías
- Todos los proveedores
- Todas las ventas
- Todas las compras
- Todas las configuraciones

Esta operación **NO se puede deshacer**.

## Archivos Relacionados

- `src/data/sample-products.ts` - Datos de los productos
- `src/utils/importSampleData.ts` - Script de importación
- `src/pages/Settings.tsx` - Interfaz de importación

## Notas

- Los productos tienen IVA incluido por defecto (19%)
- No se incluyen proveedores, deberás crearlos manualmente si los necesitas
- Las imágenes de los productos están vacías por defecto
- El stock mínimo se establece en 5 unidades para todos los productos
