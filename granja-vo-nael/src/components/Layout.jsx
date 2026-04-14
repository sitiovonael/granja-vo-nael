import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Egg, ShoppingCart, Users,
  Skull, Truck, Wheat, LogOut, Menu, X,
  Bird, BarChart2, DollarSign, Wrench, ClipboardList, UserCog
} from 'lucide-react'
import { useState } from 'react'

// Navegação do ADMIN (bottom bar)
const navAdmin = [
  { to: '/', icon: LayoutDashboard, label: 'Início', exact: true },
  { to: '/coleta', icon: Egg, label: 'Coleta' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/entregas', icon: Truck, label: 'Entregas' },
]

// Navegação do FUNCIONÁRIO (bottom bar)
const navFuncionario = [
  { to: '/', icon: LayoutDashboard, label: 'Início', exact: true },
  { to: '/coleta', icon: Egg, label: 'Coleta' },
  { to: '/mortalidade', icon: Skull, label: 'Mortalidade' },
  { to: '/preparacao', icon: ClipboardList, label: 'Preparação' },
]

// Menu lateral ADMIN
const menuAdmin = [
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/mortalidade', icon: Skull, label: 'Mortalidade' },
  { to: '/lotes', icon: Bird, label: 'Lotes' },
  { to: '/contas', icon: DollarSign, label: 'Contas a Receber' },
  { to: '/operacional', icon: Wrench, label: 'Operacional' },
  { to: '/relatorio', icon: BarChart2, label: 'Relatório' },
  { to: '/racao', icon: Wheat, label: 'Ração & Custos' },
  { to: '/usuarios', icon: UserCog, label: 'Usuários' },
]

// Menu lateral FUNCIONÁRIO
const menuFuncionario = [
  { to: '/lotes', icon: Bird, label: 'Lotes' },
]

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const navItems = isAdmin ? navAdmin : navFuncionario
  const moreItems = isAdmin ? menuAdmin : menuFuncionario

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-brand-navy text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-sm">🐔</div>
          <span className="font-bold text-sm">Granja Vô Nael</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300">{profile?.name}</span>
          <button onClick={() => setMenuOpen(true)} className="p-1"><Menu size={22} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="w-64 bg-white h-full flex flex-col shadow-xl">
            <div className="bg-brand-navy p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{profile?.name}</p>
                <p className="text-brand-orange text-xs">{isAdmin ? 'Administrador' : 'Funcionário'}</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="text-white"><X size={20} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {moreItems.map(item => (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition
                    ${isActive ? 'bg-brand-orange text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t">
              <button onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition">
                <LogOut size={18} />Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-24"><Outlet /></main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
        <div className="flex">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 pt-3 text-xs transition
                ${isActive ? 'text-brand-orange' : 'text-gray-500'}`}>
              {({ isActive }) => (
                <><item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} /><span className="mt-1">{item.label}</span></>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
