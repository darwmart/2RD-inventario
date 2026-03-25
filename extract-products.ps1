# Script para extraer productos de la base de datos FactuSOL (.mdb)

$mdbPath = "C:\Users\darwm\OneDrive\Escritorio\2RD2024.MDB"
$outputPath = "C:\Users\darwm\OneDrive\Escritorio\2RD-inventario\productos-factusol.json"

try {
    # Crear conexión a la base de datos Access
    $connection = New-Object -ComObject ADODB.Connection
    $connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$mdbPath;Persist Security Info=False;"

    # Intentar con diferentes proveedores si el primero falla
    try {
        $connection.Open($connectionString)
    } catch {
        Write-Host "Intentando con proveedor alternativo..."
        $connectionString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$mdbPath;"
        $connection.Open($connectionString)
    }

    Write-Host "Conexión exitosa a la base de datos"

    # Consulta SQL para obtener productos
    $query = "SELECT * FROM F_ART"

    $recordset = New-Object -ComObject ADODB.Recordset
    $recordset.Open($query, $connection)

    # Obtener nombres de las columnas
    Write-Host "`nColumnas disponibles en F_ART:"
    $fields = @()
    for ($i = 0; $i -lt $recordset.Fields.Count; $i++) {
        $fieldName = $recordset.Fields.Item($i).Name
        $fields += $fieldName
        Write-Host "- $fieldName"
    }

    # Convertir registros a array de objetos
    $products = @()
    $count = 0

    while (-not $recordset.EOF) {
        $product = @{}
        foreach ($field in $fields) {
            $value = $recordset.Fields.Item($field).Value
            if ($value -ne $null) {
                $product[$field] = $value
            } else {
                $product[$field] = ""
            }
        }
        $products += $product
        $recordset.MoveNext()
        $count++
    }

    Write-Host "`nTotal de productos encontrados: $count"

    # Mostrar primeros 5 productos como ejemplo
    Write-Host "`nPrimeros 5 productos (ejemplo):"
    for ($i = 0; $i -lt [Math]::Min(5, $count); $i++) {
        Write-Host "`nProducto $($i + 1):"
        $products[$i].GetEnumerator() | ForEach-Object {
            Write-Host "  $($_.Key): $($_.Value)"
        }
    }

    # Guardar en JSON
    $products | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
    Write-Host "`nDatos exportados a: $outputPath"

    # Cerrar conexiones
    $recordset.Close()
    $connection.Close()

    Write-Host "`nProceso completado exitosamente"

} catch {
    Write-Host "Error: $_"
    Write-Host $_.Exception.Message
}
