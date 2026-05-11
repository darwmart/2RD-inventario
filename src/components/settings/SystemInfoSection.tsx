export default function SystemInfoSection() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Información del Sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-6 bg-gray-50 rounded-lg border">
          <p className="font-medium text-gray-600 mb-2">Versión</p>
          <p className="text-3xl font-bold text-blue-600">1.0.0</p>
        </div>
        <div className="text-center p-6 bg-gray-50 rounded-lg border">
          <p className="font-medium text-gray-600 mb-2">Almacenamiento</p>
          <p className="text-3xl font-bold text-green-600">Local</p>
        </div>
        <div className="text-center p-6 bg-gray-50 rounded-lg border">
          <p className="font-medium text-gray-600 mb-2">Estado</p>
          <p className="text-3xl font-bold text-green-600">Activo</p>
        </div>
      </div>
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Este sistema utiliza almacenamiento local del navegador.
          Los datos se mantienen en tu dispositivo de forma segura.
        </p>
      </div>
    </div>
  );
}
