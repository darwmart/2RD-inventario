import json
import sys

try:
    import pyodbc
    print("pyodbc disponible")
except ImportError:
    print("pyodbc no está instalado. Intentando instalar...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyodbc"])
    import pyodbc

# Ruta al archivo .mdb
mdb_path = r"C:\Users\darwm\OneDrive\Escritorio\2RD2024.MDB"
output_path = r"C:\Users\darwm\OneDrive\Escritorio\2RD-inventario\productos-factusol.json"

# Intentar diferentes connection strings
connection_strings = [
    f'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={mdb_path};',
    f'DRIVER={{Microsoft Access Driver (*.mdb)}};DBQ={mdb_path};',
    f'DRIVER={{Driver do Microsoft Access (*.mdb)}};DBQ={mdb_path};',
]

conn = None
for conn_str in connection_strings:
    try:
        print(f"Intentando conectar con: {conn_str[:50]}...")
        conn = pyodbc.connect(conn_str)
        print("✓ Conexión exitosa")
        break
    except Exception as e:
        print(f"✗ Falló: {str(e)[:100]}")
        continue

if conn is None:
    print("\nNo se pudo conectar a la base de datos.")
    print("Controladores ODBC disponibles:")
    print(pyodbc.drivers())
    sys.exit(1)

try:
    cursor = conn.cursor()

    # Obtener nombres de columnas
    cursor.execute("SELECT * FROM F_ART WHERE 1=0")
    columns = [column[0] for column in cursor.description]
    print(f"\nColumnas encontradas en F_ART ({len(columns)}):")
    for col in columns:
        print(f"  - {col}")

    # Obtener todos los productos
    cursor.execute("SELECT * FROM F_ART")
    rows = cursor.fetchall()

    print(f"\nTotal de productos encontrados: {len(rows)}")

    # Convertir a lista de diccionarios
    products = []
    for row in rows:
        product = {}
        for i, col in enumerate(columns):
            value = row[i]
            # Convertir tipos no serializables
            if value is not None:
                if isinstance(value, (int, float, str, bool)):
                    product[col] = value
                else:
                    product[col] = str(value)
            else:
                product[col] = None
        products.append(product)

    # Mostrar primeros 3 productos como ejemplo
    print("\nEjemplo de productos (primeros 3):")
    for i, prod in enumerate(products[:3]):
        print(f"\n--- Producto {i+1} ---")
        for key, value in prod.items():
            if value is not None and value != '':
                print(f"  {key}: {value}")

    # Guardar en JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Datos exportados exitosamente a: {output_path}")
    print(f"✓ Total de productos: {len(products)}")

except Exception as e:
    print(f"\nError al leer datos: {e}")
    import traceback
    traceback.print_exc()
finally:
    if conn:
        conn.close()
