import { lazy, Suspense, useEffect, useState } from 'react'
import { SplashScreen } from '@/components/splash/SplashScreen'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { PageLoading } from '@/components/ui/loading'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { syncPlayerStateCloud } from '@/services/backend'
import { useAuthStore } from '@/stores/authStore'

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CampaignPage = lazy(() => import('@/pages/CampaignPage'))
const MissionBriefingPage = lazy(() => import('@/pages/MissionBriefingPage'))
const MissionPlannerPage = lazy(() => import('@/pages/MissionPlannerPage'))
const DesignerPage = lazy(() => import('@/pages/DesignerPage'))
const LaunchPage = lazy(() => import('@/pages/LaunchPage'))
const LaunchOperationsPage = lazy(() => import('@/pages/LaunchOperationsPage'))
const ValidationPage = lazy(() => import('@/pages/ValidationPage'))
const SimulationPage = lazy(() => import('@/pages/SimulationPage'))
const MissionControlPage = lazy(() => import('@/pages/MissionControlPage'))
const MissionLabPage = lazy(() => import('@/pages/MissionLabPage'))
const ResultsPage = lazy(() => import('@/pages/ResultsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const DemoEntryPage = lazy(() => import('@/pages/DemoEntryPage'))
const CrewPage = lazy(() => import('@/pages/CrewPage'))
const ModelCheckPage = lazy(() => import('@/pages/ModelCheckPage'))

/** `?demo=<mission>&screen=<step>` on any URL is a judge demo link. */
function DemoQueryGate({ children }: { children: React.ReactNode }) {
  const { search } = useLocation()
  return new URLSearchParams(search).has('demo') ? <DemoEntryPage /> : <>{children}</>
}

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth)

  useEffect(() => {
    initializeAuth().catch(() => {})
    syncPlayerStateCloud().catch(() => {})
  }, [initializeAuth])

  // Entry splash: once per session, only when arriving at the home page (deep links skip it)
  const [splash, setSplash] = useState<'show' | 'leaving' | 'done'>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (window.location.pathname !== '/' || params.has('nosplash') || params.has('demo')) return 'done'
      return sessionStorage.getItem('orbitx-splash-seen') ? 'done' : 'show'
    } catch {
      return 'done'
    }
  })
  const finishSplash = () => {
    try {
      sessionStorage.setItem('orbitx-splash-seen', '1')
    } catch {
      /* storage unavailable: the splash may show again next visit */
    }
    setSplash('done')
  }

  // The splash stays mounted from loading through its exit; the app is drawn underneath as it leaves
  return (
    <>
    {splash !== 'show' && (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public Entrance & Authentication Routes */}
          <Route path="/" element={<DemoQueryGate><LandingPage /></DemoQueryGate>} />
          <Route path="/demo" element={<DemoEntryPage />} />
          <Route path="/demo/:mission" element={<DemoEntryPage />} />
          <Route path="/demo/:mission/:screen" element={<DemoEntryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Mission Console Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/campaign" element={<CampaignPage />} />
              <Route path="/crew" element={<CrewPage />} />
              <Route path="/model-check" element={<ModelCheckPage />} />
              <Route path="/campaign/:missionId" element={<MissionBriefingPage />} />
              <Route path="/mission-planner/:missionId" element={<MissionPlannerPage />} />
              <Route path="/designer/:missionId" element={<DesignerPage />} />
              <Route path="/launch/:missionId" element={<LaunchPage />} />
              <Route path="/launch-operations/:missionId" element={<LaunchOperationsPage />} />
              <Route path="/validation/:missionId" element={<ValidationPage />} />
              <Route path="/simulation/:missionId" element={<SimulationPage />} />
              <Route path="/mission-control/:missionId" element={<MissionControlPage />} />
              <Route path="/mission-lab" element={<MissionLabPage />} />
              <Route path="/results/:missionId" element={<ResultsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    )}
    {splash !== 'done' && <SplashScreen onReady={finishSplash} onLeave={() => setSplash('leaving')} />}
    </>
  )
}
