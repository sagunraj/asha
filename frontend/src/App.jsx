import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import DonorDashboard from './pages/DonorDashboard'
import AppLayout from './components/layout/AppLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import DonorsPage from './pages/admin/DonorsPage'
import DonationsPage from './pages/admin/DonationsPage'
import ReceiptsPage from './pages/admin/ReceiptsPage'
import ReceiptTemplatesPage from './pages/admin/ReceiptTemplatesPage'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, role } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Donor portal */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DonorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin panel */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout><AdminDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/donors"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout><DonorsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/donations"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout><DonationsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/receipts"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout><ReceiptsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/receipt-templates"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout><ReceiptTemplatesPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Redirect old route */}
      <Route path="/admin/tax-receipts" element={<Navigate to="/admin/receipts" replace />} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
