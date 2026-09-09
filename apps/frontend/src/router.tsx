import { Navigate, Route, Routes } from 'react-router';

import { CommercialPage } from '@/features/commercial/pages/CommercialPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/commercial" replace />} />
      <Route path="/commercial" element={<CommercialPage />} />
    </Routes>
  );
}
