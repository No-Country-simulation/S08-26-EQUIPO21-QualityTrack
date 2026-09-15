import { Navigate, Route, Routes } from 'react-router';

import { AppLayout } from '@/components/layout/AppLayout';
import { CommercialPage } from '@/features/commercial/pages/CommercialPage';

// Placeholder para secciones del sidebar (Producción, Calidad, Auditoría)
// que todavía no tienen su propia página -- sin esta ruta comodín, un
// <Route> anidado sin path que matchee no renderiza nada, y el sidebar
// desaparecería junto con el contenido.
// TODO: Crear la pagina 404 personalizada y borrar este placeholder
function ComingSoonPage() {
  return <p className="p-6 text-sm text-gray-500">Próximamente.</p>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/commercial" replace />} />
        <Route path="/commercial" element={<CommercialPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  );
}
