import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResultsPage } from './pages/ResultsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { TrackedProductsPage } from './pages/TrackedProductsPage';
import { SearchHistoryPage } from './pages/SearchHistoryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<DashboardPage />} />
          <Route path="/results/:searchId" element={<ResultsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/tracked" element={<TrackedProductsPage />} />
          <Route path="/history" element={<SearchHistoryPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
