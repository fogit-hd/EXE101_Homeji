import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './components/layout/AppLayout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { GoogleMapsProvider } from './contexts/GoogleMapsProvider'
import { NetworkStatusProvider } from './contexts/NetworkStatusContext'
import { AdminModerationPage } from './pages/AdminModerationPage'
import { CreateRentalPostPage } from './pages/CreateRentalPostPage'
import { EditRentalPostPage } from './pages/EditRentalPostPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PaymentPage } from './pages/PaymentPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { RentalPostDetailPage } from './pages/RentalPostDetailPage'
import { AuthCallbackPage, ResetPasswordPage } from './pages/ResetPasswordPage'
import { RoommateInvitationsPage } from './pages/RoommateInvitationsPage'
import { SavedPostsPage } from './pages/SavedPostsPage'
import './components/layout/footer.css'
import './pages/HomePage.css'
import './pages/auth.css'
import './pages/detail.css'
import './pages/post-form.css'
import './pages/pages.css'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route path="/posts/:postId" element={<ProtectedRoute><RentalPostDetailPage /></ProtectedRoute>} />
          <Route path="/posts/new" element={<ProtectedRoute><CreateRentalPostPage /></ProtectedRoute>} />
          <Route path="/posts/:postId/edit" element={<ProtectedRoute><EditRentalPostPage /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><SavedPostsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/invitations" element={<ProtectedRoute><RoommateInvitationsPage /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminModerationPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ErrorBoundary reloadOnRetry>
      <NetworkStatusProvider>
        <GoogleMapsProvider>
          <AuthProvider>
            {/* Boundary trong AuthProvider: lỗi trang → thông báo chung + Thử lại */}
            <ErrorBoundary reloadOnRetry>
              <AppRoutes />
            </ErrorBoundary>
          </AuthProvider>
        </GoogleMapsProvider>
      </NetworkStatusProvider>
    </ErrorBoundary>
  )
}

export default App
