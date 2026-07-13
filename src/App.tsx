import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './components/layout/AppLayout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { AuthModalProvider } from './contexts/AuthModalContext'
import { GoogleMapsProvider } from './contexts/GoogleMapsProvider'
import { NetworkStatusProvider } from './contexts/NetworkStatusContext'
import { ThemeSync } from './components/ThemeSync'
import { SteveSplash } from './components/SteveSplash'
import { AdminModerationPage } from './pages/AdminModerationPage'
import { CreateRentalPostPage } from './pages/CreateRentalPostPage'
import { EditRentalPostPage } from './pages/EditRentalPostPage'
import { ExplorePage } from './pages/ExplorePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { MyPostsPage } from './pages/MyPostsPage'
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
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/posts/:postId" element={<RentalPostDetailPage />} />
        <Route path="/posts/new" element={<ProtectedRoute><CreateRentalPostPage /></ProtectedRoute>} />
        <Route path="/posts/:postId/edit" element={<ProtectedRoute><EditRentalPostPage /></ProtectedRoute>} />
        <Route path="/my-posts" element={<ProtectedRoute><MyPostsPage /></ProtectedRoute>} />
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
  )
}

function App() {
  return (
    <ErrorBoundary reloadOnRetry>
      <SteveSplash>
        <ThemeSync />
        <NetworkStatusProvider>
          <GoogleMapsProvider>
            <AuthProvider>
              <BrowserRouter>
                <AuthModalProvider>
                  <ErrorBoundary reloadOnRetry>
                    <AppRoutes />
                  </ErrorBoundary>
                </AuthModalProvider>
              </BrowserRouter>
            </AuthProvider>
          </GoogleMapsProvider>
        </NetworkStatusProvider>
      </SteveSplash>
    </ErrorBoundary>
  )
}

export default App
