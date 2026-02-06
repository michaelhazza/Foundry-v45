import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './lib/ErrorBoundary';
import { isAuthenticated } from './lib/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectSourceDetailPage from './pages/ProjectSourceDetailPage';
import ProcessingJobDetailPage from './pages/ProcessingJobDetailPage';
import DatasetDetailPage from './pages/DatasetDetailPage';
import SourcesPage from './pages/SourcesPage';
import SourceDetailPage from './pages/SourceDetailPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/dashboard" className="text-xl font-bold text-gray-900">AI Data Foundry</a>
              <a href="/projects" className="text-gray-600 hover:text-gray-900">Projects</a>
              <a href="/sources" className="text-gray-600 hover:text-gray-900">Sources</a>
              <a href="/users" className="text-gray-600 hover:text-gray-900">Users</a>
              <a href="/settings" className="text-gray-600 hover:text-gray-900">Settings</a>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Layout><ProjectsPage /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><Layout><ProjectDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId/sources/:projectSourceId" element={<ProtectedRoute><Layout><ProjectSourceDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId/processing-jobs/:jobId" element={<ProtectedRoute><Layout><ProcessingJobDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId/datasets/:datasetId" element={<ProtectedRoute><Layout><DatasetDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/sources" element={<ProtectedRoute><Layout><SourcesPage /></Layout></ProtectedRoute>} />
          <Route path="/sources/:sourceId" element={<ProtectedRoute><Layout><SourceDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>} />
          <Route path="/users/:userId" element={<ProtectedRoute><Layout><UserDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
