import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Toaster } from './components/Toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { LoadingState } from './components/states';

// Ленивые роуты: страницы грузятся по требованию — меньше первый бандл, быстрее вход.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const TrackedProductsPage = lazy(() =>
  import('./pages/TrackedProductsPage').then((m) => ({ default: m.TrackedProductsPage })),
);
const SearchHistoryPage = lazy(() =>
  import('./pages/SearchHistoryPage').then((m) => ({ default: m.SearchHistoryPage })),
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <Suspense fallback={<LoadingState />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/search"
              element={
                <Suspense fallback={<LoadingState />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/results/:searchId"
              element={
                <Suspense fallback={<LoadingState />}>
                  <ResultsPage />
                </Suspense>
              }
            />
            <Route
              path="/favorites"
              element={
                <Suspense fallback={<LoadingState />}>
                  <FavoritesPage />
                </Suspense>
              }
            />
            <Route
              path="/tracked"
              element={
                <Suspense fallback={<LoadingState />}>
                  <TrackedProductsPage />
                </Suspense>
              }
            />
            <Route
              path="/history"
              element={
                <Suspense fallback={<LoadingState />}>
                  <SearchHistoryPage />
                </Suspense>
              }
            />
            <Route
              path="/notifications"
              element={
                <Suspense fallback={<LoadingState />}>
                  <NotificationsPage />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<LoadingState />}>
                  <SettingsPage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
