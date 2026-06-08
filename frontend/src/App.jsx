import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthProvider from './context/AuthContext'
import ThemeProvider from './context/ThemeContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Navbar from './components/ui/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import Profile from './pages/Profile'
import GapDetail from './pages/GapDetail'
import Interdisciplinary from './pages/Interdisciplinary'
import AdminRoute from './components/auth/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import ResearchMap from './pages/admin/ResearchMap'
import SearchActivity from './pages/admin/SearchActivity'
import ScoreDistribution from './pages/admin/ScoreDistribution'
import GapLeaderboard from './pages/admin/GapLeaderboard'
import CitationDensity from './pages/admin/CitationDensity'
import ContradictionStats from './pages/admin/ContradictionStats'
import DataFreshness from './pages/admin/DataFreshness'
import UserGrowth from './pages/admin/UserGrowth'
import PipelineMonitor from './pages/admin/PipelineMonitor'
import FrontierMap from './pages/admin/FrontierMap'
import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div style={{minHeight:'100vh', background:'var(--bg-page)', color:'var(--text-primary)', transition: 'background-color 0.2s, color 0.2s'}}>
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute><Search /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/gap/:topicSlug/:gapId" element={
                <ProtectedRoute><GapDetail /></ProtectedRoute>
              } />
              <Route path="/interdisciplinary" element={
                <ProtectedRoute><Interdisciplinary /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute><AdminLayout /></AdminRoute>
              }>
                <Route index element={<AdminOverview />} />
                <Route path="map" element={<ResearchMap />} />
                <Route path="activity" element={<SearchActivity />} />
                <Route path="distribution" element={<ScoreDistribution />} />
                <Route path="leaderboard" element={<GapLeaderboard />} />
                <Route path="density" element={<CitationDensity />} />
                <Route path="contradictions" element={<ContradictionStats />} />
                <Route path="freshness" element={<DataFreshness />} />
                <Route path="users" element={<UserGrowth />} />
                <Route path="pipeline" element={<PipelineMonitor />} />
                <Route path="frontier" element={<FrontierMap />} />
              </Route>
            </Routes>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '16px' 
                }
              }}
            />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

