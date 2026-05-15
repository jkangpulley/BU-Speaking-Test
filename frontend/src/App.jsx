import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Test from './pages/Test'
import Complete from './pages/Complete'
import Dashboard from './pages/admin/Dashboard'
import Students from './pages/admin/Students'
import StudentDetail from './pages/admin/StudentDetail'
import Placement from './pages/admin/Placement'

function ProtectedStudent({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'student') return <Navigate to="/admin" replace />
  return children
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/test" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/test" element={
            <ProtectedStudent><Test /></ProtectedStudent>
          } />
          <Route path="/complete" element={
            <ProtectedStudent><Complete /></ProtectedStudent>
          } />

          <Route path="/admin" element={
            <ProtectedAdmin><Dashboard /></ProtectedAdmin>
          } />
          <Route path="/admin/students" element={
            <ProtectedAdmin><Students /></ProtectedAdmin>
          } />
          <Route path="/admin/students/:id" element={
            <ProtectedAdmin><StudentDetail /></ProtectedAdmin>
          } />
          <Route path="/admin/placement" element={
            <ProtectedAdmin><Placement /></ProtectedAdmin>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
