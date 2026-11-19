import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './components/AppLayout';
import { useApp } from './context/AppContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import InstructorConsole from './pages/InstructorConsole';
import StudentPortal from './pages/StudentPortal';
import ArchitectureView from './pages/ArchitectureView';
import EdgeCaseSuite from './pages/EdgeCaseSuite';
import type { Role } from './types';

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser } = useApp();
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'instructor' ? '/instructor' : '/student'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route
          path="/instructor"
          element={
            <RequireRole role="instructor">
              <InstructorConsole />
            </RequireRole>
          }
        />
        <Route
          path="/student"
          element={
            <RequireRole role="student">
              <StudentPortal />
            </RequireRole>
          }
        />
        <Route path="/architecture" element={<ArchitectureView />} />
        <Route path="/edge-cases" element={<EdgeCaseSuite />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
