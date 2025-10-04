import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout components
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import WorkflowManagement from './pages/admin/WorkflowManagement';
import CompanySettings from './pages/admin/CompanySettings';
import AdminReports from './pages/admin/AdminReports';

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import PendingApprovals from './pages/manager/PendingApprovals';
import ApprovalHistory from './pages/manager/ApprovalHistory';
import TeamManagement from './pages/manager/TeamManagement';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ExpenseSubmission from './pages/employee/ExpenseSubmission';
import ExpenseHistory from './pages/employee/ExpenseHistory';
import ExpenseDetails from './pages/employee/ExpenseDetails';

// Shared pages
import Profile from './pages/shared/Profile';
import NotFound from './pages/shared/NotFound';

// Loading component
import LoadingSpinner from './components/common/LoadingSpinner';

// Protected route component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Public route component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Dashboard redirect based on user role
const DashboardRedirect = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'manager':
      return <Navigate to="/manager/dashboard" replace />;
    case 'employee':
      return <Navigate to="/employee/dashboard" replace />;
    default:
      return <Navigate to="/signin" replace />;
  }
};

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={
          <PublicRoute>
            <AuthLayout>
              <SignIn />
            </AuthLayout>
          </PublicRoute>
        } />
        
        <Route path="/signup" element={
          <PublicRoute>
            <AuthLayout>
              <SignUp />
            </AuthLayout>
          </PublicRoute>
        } />

        {/* Dashboard redirect */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin']}>
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="categories" element={<CategoryManagement />} />
                <Route path="workflows" element={<WorkflowManagement />} />
                <Route path="settings" element={<CompanySettings />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Manager routes */}
        <Route path="/manager/*" element={
          <ProtectedRoute roles={['manager', 'admin']}>
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="approvals" element={<PendingApprovals />} />
                <Route path="history" element={<ApprovalHistory />} />
                <Route path="team" element={<TeamManagement />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Employee routes */}
        <Route path="/employee/*" element={
          <ProtectedRoute roles={['employee', 'manager', 'admin']}>
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="submit" element={<ExpenseSubmission />} />
                <Route path="expenses" element={<ExpenseHistory />} />
                <Route path="expenses/:id" element={<ExpenseDetails />} />
                <Route path="profile" element={<Profile />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;