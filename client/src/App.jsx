import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import AnnouncementBanner from './components/AnnouncementBanner'
import ErrorBoundary from './components/ErrorBoundary'
import Skeleton from './components/Skeleton'

const MapViewPage       = lazy(() => import('./pages/MapViewPage'))
const LoginPage         = lazy(() => import('./pages/LoginPage'))
const RegisterPage      = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage= lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ReportIssuePage   = lazy(() => import('./pages/ReportIssuePage'))
const IssueDetailPage   = lazy(() => import('./pages/IssueDetailPage'))
const MyReportsPage     = lazy(() => import('./pages/MyReportsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const AdminPage         = lazy(() => import('./pages/AdminPage'))
const OfficerPage       = lazy(() => import('./pages/OfficerPage'))
const StatsPage         = lazy(() => import('./pages/StatsPage'))
const LeaderboardPage   = lazy(() => import('./pages/LeaderboardPage'))

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#f1f5f9]">
      <div className="flex flex-col items-center gap-4 w-64">
        <Skeleton height="40px" width="40px" radius="50%" />
        <Skeleton height="14px" width="120px" />
      </div>
    </div>
  )
}

function PageSuspense({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <Navbar />
      <AnnouncementBanner />
      <div>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<PageSuspense><MapViewPage /></PageSuspense>} />
            <Route path="/login" element={<PageSuspense><LoginPage /></PageSuspense>} />
            <Route path="/register" element={<PageSuspense><RegisterPage /></PageSuspense>} />
            <Route path="/forgot-password" element={<PageSuspense><ForgotPasswordPage /></PageSuspense>} />
            <Route path="/reset-password" element={<PageSuspense><ResetPasswordPage /></PageSuspense>} />
            <Route path="/issues/:id" element={<PageSuspense><IssueDetailPage /></PageSuspense>} />
            <Route path="/stats" element={<PageSuspense><StatsPage /></PageSuspense>} />
            <Route path="/leaderboard" element={<PageSuspense><LeaderboardPage /></PageSuspense>} />

            <Route path="/report" element={
              <ProtectedRoute>
                <PageSuspense><ReportIssuePage /></PageSuspense>
              </ProtectedRoute>
            } />
            <Route path="/my-reports" element={
              <ProtectedRoute>
                <PageSuspense><MyReportsPage /></PageSuspense>
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <PageSuspense><NotificationsPage /></PageSuspense>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <PageSuspense><AdminPage /></PageSuspense>
              </ProtectedRoute>
            } />
            <Route path="/officer" element={
              <ProtectedRoute roles={['officer', 'admin']}>
                <PageSuspense><OfficerPage /></PageSuspense>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  )
}
