import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { useAuth } from './hooks/useAuth'
import LandingPage from './components/LandingPage'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ClientDashboard from './components/client/ClientDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import Header from './components/common/Header'
import ConfirmationPage from './components/client/ConfirmationPage'
import InstallPrompt from './components/common/InstallPrompt'
import { Spinner, Container } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

// Componente de Loading
const LoadingSpinner = () => (
  <Container className="text-center py-5">
    <Spinner animation="border" role="status" variant="primary">
      <span className="visually-hidden">Cargando...</span>
    </Spinner>
    <p className="mt-3">Cargando...</p>
  </Container>
)

// Componente para proteger rutas
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user.type !== 'admin') {
    return <Navigate to="/client" replace />
  }

  return children
}

// Componente para rutas públicas (solo para no-autenticados)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  // Si ya está autenticado, redirigir al dashboard correspondiente
  if (user) {
    if (user.type === 'admin') {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/client" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <div className="App">
          <InstallPrompt />
          
          <Routes>
            {/* Rutas públicas (solo para usuarios NO autenticados) */}
            <Route path="/login" element={
              <PublicRoute>
                <>
                  <Header />
                  <Login />
                </>
              </PublicRoute>
            } />
            
            <Route path="/register" element={
              <PublicRoute>
                <>
                  <Header />
                  <Register />
                </>
              </PublicRoute>
            } />
            
            <Route path="/" element={
              <PublicRoute>
                <>
                  <Header />
                  <LandingPage />
                </>
              </PublicRoute>
            } />
            
            {/* IMPORTANTE: Poner /confirmacion ANTES de /client/* */}
            {/* Confirmación (ruta protegida con Header) */}
            <Route path="/confirmacion" element={
              <ProtectedRoute>
                <>
                  <Header />
                  <ConfirmationPage />
                </>
              </ProtectedRoute>
            } />
            
            {/* Rutas protegidas - Cliente */}
            <Route path="/client" element={
              <ProtectedRoute>
                <>
                  <Header />
                  <ClientDashboard />
                </>
              </ProtectedRoute>
            } />
            
            {/* Rutas protegidas - Admin */}
            <Route path="/admin/*" element={
              <ProtectedRoute requireAdmin>
                <>
                  <Header />
                  <AdminDashboard />
                </>
              </ProtectedRoute>
            } />
            
            {/* Ruta por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Suspense>
    </AuthProvider>
  )
}

export default App