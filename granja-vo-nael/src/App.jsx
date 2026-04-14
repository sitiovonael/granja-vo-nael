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
import Lote from './pages/Lote'
import Relatorio from './pages/Relatorio'
import ContasReceber from './pages/ContasReceber'
import Operacional from './pages/Operacional'
import Preparacao from './pages/Preparacao'
import Usuarios from './pages/Usuarios'

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
            <Route path="mortalidade" element={<Mortalidade />} />
            <Route path="lotes" element={<Lote />} />
            <Route path="preparacao" element={<Preparacao />} />
            {/* Apenas admin */}
            <Route path="vendas" element={<AdminRoute><Vendas /></AdminRoute>} />
            <Route path="clientes" element={<AdminRoute><Clientes /></AdminRoute>} />
            <Route path="entregas" element={<AdminRoute><Entregas /></AdminRoute>} />
            <Route path="relatorio" element={<AdminRoute><Relatorio /></AdminRoute>} />
            <Route path="contas" element={<AdminRoute><ContasReceber /></AdminRoute>} />
            <Route path="operacional" element={<AdminRoute><Operacional /></AdminRoute>} />
            <Route path="racao" element={<AdminRoute><Racao /></AdminRoute>} />
            <Route path="usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
