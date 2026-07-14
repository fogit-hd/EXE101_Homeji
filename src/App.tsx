import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './components/layout/AppLayout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { AuthModalProvider } from './contexts/AuthModalContext'
import { GoogleMapsProvider } from './contexts/GoogleMapsProvider'
import { NetworkStatusProvider } from './contexts/NetworkStatusContext'
import { ThemeSync } from './components/ThemeSync'
import { MapHomePostRedirect, MapHomeSectionRedirect } from './lib/mapDeepLinks'
import { AdminModerationPage } from './pages/AdminModerationPage'
import { CreateRentalPostPage } from './pages/CreateRentalPostPage'
import { EditRentalPostPage } from './pages/EditRentalPostPage'
import { ExplorePage } from './pages/ExplorePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AuthCallbackPage, ResetPasswordPage } from './pages/ResetPasswordPage'
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

        {/* Listing detail lives in the map place-info panel — no standalone page. */}
        <Route path="/posts/:postId" element={<MapHomePostRedirect />} />
        <Route path="/posts/new" element={<ProtectedRoute><CreateRentalPostPage /></ProtectedRoute>} />
        <Route path="/posts/:postId/edit" element={<ProtectedRoute><EditRentalPostPage /></ProtectedRoute>} />

        {/* Former full-page shells → map home + right panel section */}
        <Route path="/my-posts" element={<ProtectedRoute><MapHomeSectionRedirect section="myPosts" /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><MapHomeSectionRedirect section="marketplace" /></ProtectedRoute>} />
        <Route path="/wanted" element={<ProtectedRoute><MapHomeSectionRedirect section="wanted" /></ProtectedRoute>} />
        <Route path="/activities" element={<ProtectedRoute><MapHomeSectionRedirect section="activities" /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><MapHomeSectionRedirect section="saved" /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MapHomeSectionRedirect section="profile" /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><MapHomeSectionRedirect section="notifications" /></ProtectedRoute>} />
        <Route path="/invitations" element={<ProtectedRoute><MapHomeSectionRedirect section="invitations" /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><MapHomeSectionRedirect section="payments" /></ProtectedRoute>} />

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
    </ErrorBoundary>
  )
}

export default App
