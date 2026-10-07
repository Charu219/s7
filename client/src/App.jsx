import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { SpinnerCenter } from './components/ui/Spinner';

// Public pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import QuestionnairePage from './pages/donor/QuestionnairePage';
import HealthReportsPage from './pages/donor/HealthReportsPage';
import AppointmentsPage from './pages/donor/AppointmentsPage';
import BloodRequestsPage from './pages/donor/BloodRequestsPage';

// Recipient pages
import RecipientDashboard from './pages/recipient/RecipientDashboard';
import NewBloodRequestPage from './pages/recipient/NewBloodRequestPage';
import MyRequestsPage from './pages/recipient/MyRequestsPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDonorsPage from './pages/admin/AdminDonorsPage';
import AdminBloodRequestsPage from './pages/admin/AdminBloodRequestsPage';
import AdminAppointmentsPage from './pages/admin/AdminAppointmentsPage';
import AdminDoctorsPage from './pages/admin/AdminDoctorsPage';

// Shared
import ProfilePage from './pages/shared/ProfilePage';

import './App.css';

// ─── Auth Guards ──────────────────────────────────────────────────────────────

function RequireAuth({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <SpinnerCenter size="lg" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) {
    if (user?.role === 'DONOR') return <Navigate to="/donor/dashboard" replace />;
    if (user?.role === 'RECIPIENT') return <Navigate to="/recipient/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function RequireGuest({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <SpinnerCenter size="lg" />;
  if (isAuthenticated) {
    if (user?.role === 'DONOR') return <Navigate to="/donor/dashboard" replace />;
    if (user?.role === 'RECIPIENT') return <Navigate to="/recipient/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

// ─── App Routes ───────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
      <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />

      {/* Authenticated layout */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>

        {/* Shared */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Donor */}
        <Route path="/donor/dashboard"      element={<RequireAuth roles={['DONOR']}><DonorDashboard /></RequireAuth>} />
        <Route path="/donor/questionnaire"  element={<RequireAuth roles={['DONOR']}><QuestionnairePage /></RequireAuth>} />
        <Route path="/donor/health-reports" element={<RequireAuth roles={['DONOR']}><HealthReportsPage /></RequireAuth>} />
        <Route path="/donor/appointments"   element={<RequireAuth roles={['DONOR']}><AppointmentsPage /></RequireAuth>} />
        <Route path="/donor/blood-requests" element={<RequireAuth roles={['DONOR']}><BloodRequestsPage /></RequireAuth>} />

        {/* Recipient */}
        <Route path="/recipient/dashboard"   element={<RequireAuth roles={['RECIPIENT']}><RecipientDashboard /></RequireAuth>} />
        <Route path="/recipient/new-request" element={<RequireAuth roles={['RECIPIENT']}><NewBloodRequestPage /></RequireAuth>} />
        <Route path="/recipient/my-requests" element={<RequireAuth roles={['RECIPIENT']}><MyRequestsPage /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin/dashboard"      element={<RequireAuth roles={['ADMIN']}><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/donors"         element={<RequireAuth roles={['ADMIN']}><AdminDonorsPage /></RequireAuth>} />
        <Route path="/admin/blood-requests" element={<RequireAuth roles={['ADMIN']}><AdminBloodRequestsPage /></RequireAuth>} />
        <Route path="/admin/appointments"   element={<RequireAuth roles={['ADMIN']}><AdminAppointmentsPage /></RequireAuth>} />
        <Route path="/admin/doctors"        element={<RequireAuth roles={['ADMIN']}><AdminDoctorsPage /></RequireAuth>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-sans)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
