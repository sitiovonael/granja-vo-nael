import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Coleta from './pages/Coleta'
import Vendas from './pages/Vendas'
import Clientes from './pages/Clientes'
import Mortalidade from './pages/Mortalidade'
import Racao from './pages/Racao'
import Entregas from './pages/Entregas'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Carregando...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  return isAdmin ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="coleta" element={<Coleta />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="mortalidade" element={<Mortalidade />} />
            <Route path="entregas" element={<Entregas />} />
            <Route path="racao" element={<AdminRoute><Racao /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
