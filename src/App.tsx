import { GoogleOAuthProvider } from '@react-oauth/google'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WebsiteTrafficTracker } from './components/WebsiteTrafficTracker'
import { AppLayout } from './components/layout/AppLayout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { SearchProvider } from './contexts/SearchContext'
import { ToastProvider } from './components/toast/ToastProvider'
import { AuthModalProvider } from './contexts/AuthModalContext'
import { ChatbotProvider } from './contexts/ChatbotContext'
import { GoogleMapsProvider } from './contexts/GoogleMapsProvider'
import { NetworkStatusProvider } from './contexts/NetworkStatusContext'
import { googleOAuthClientId } from './lib/googleOAuthClient'
import { ThemeSync } from './components/ThemeSync'
import { AiInteractionEffects } from './components/ai/AiInteractionEffects'
import { InteractionMotion } from './components/motion/InteractionMotion'
import { MapHomePostRedirect, MapHomeSectionRedirect } from './lib/mapDeepLinks'
import {
  AdminModerationPage, CreateRentalPostPage, EditRentalPostPage, ExplorePage,
  ForgotPasswordPage, HomePage, PaymentWaitingPage, LoginPage, PrivacyPolicyPage,
  TermsOfServicePage, RegisterPage, AuthCallbackPage, ResetPasswordPage,
} from './pages/deferredPages'
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
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

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
        <Route path="/payments/wait" element={<ProtectedRoute><PaymentWaitingPage /></ProtectedRoute>} />

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

/** One provider for every route that mounts GoogleLogin. Skipped when the client id is unset. */
function GoogleOAuthRoot({ children }: { children: ReactNode }) {
  if (!googleOAuthClientId) return children
  return <GoogleOAuthProvider clientId={googleOAuthClientId}>{children}</GoogleOAuthProvider>
}

function App() {
  return (
    <ErrorBoundary reloadOnRetry>
      <ThemeSync />
      <AiInteractionEffects />
      <InteractionMotion />
      <NetworkStatusProvider>
        <GoogleMapsProvider>
          <GoogleOAuthRoot>
            <AuthProvider>
            <BrowserRouter>
              <WebsiteTrafficTracker />
              <SearchProvider>
              <ToastProvider>
              <AuthModalProvider>
                <ChatbotProvider>
                <ErrorBoundary reloadOnRetry>
                  <AppRoutes />
                </ErrorBoundary>
                </ChatbotProvider>
              </AuthModalProvider>
              </ToastProvider>
              </SearchProvider>
            </BrowserRouter>
          </AuthProvider>
          </GoogleOAuthRoot>
        </GoogleMapsProvider>
      </NetworkStatusProvider>
    </ErrorBoundary>
  )
}

export default App
