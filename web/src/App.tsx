import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from './store/store'
import { loadUser } from './store/slices/authSlice'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import JobSearchPage from './pages/jobs/JobSearchPage'
import JobDetailPage from './pages/jobs/JobDetailPage'
import ApplicationsPage from './pages/applications/ApplicationsPage'
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage'
import ResumeUploadPage from './pages/resumes/ResumeUploadPage'
import ProfilePage from './pages/profile/ProfilePage'
import AIAssistantPage from './pages/ai/AIAssistantPage'
import SettingsPage from './pages/settings/SettingsPage'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    dispatch(loadUser())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/dashboard" />} />
      
      {token ? (
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobSearchPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/resume" element={<ResumeUploadPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  )
}

export default App

