import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, ShieldCheck, UserCircle } from 'lucide-react'

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(null)

  useEffect(() => { loadUsuarios() }, [])

  async function loadUsuarios() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    setUsuarios(data || [])
    setLoading(false)
  }

  async function alterarRole(id, novoRole) {
    setSalvando(id)
    await supabase.from('profiles').update({ role: novoRole }).eq('id', id)
    await loadUsuarios()
    setSalvando(null)
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Carregando...</div>

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-brand-navy text-xl font-bold">Usuários</h1>
        <p className="text-sm text-gray-500">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {usuarios.map(u => {
          const isYou = u.id === currentUser?.id
          const isAdmin = u.role === 'admin'

          return (
            <div key={u.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-brand-navy' : 'bg-gray-200'}`}>
                  {isAdmin
                    ? <ShieldCheck size={20} className="text-brand-orange" />
                    : <UserCircle size={20} className="text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-brand-navy text-sm truncate">{u.name}</p>
                    {isYou && (
                      <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full font-medium shrink-0">você</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Selector de role */}
                {isYou ? (
                  <span className={`text-xs px-3 py-1.5 rounded-xl font-medium ${isAdmin ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {isAdmin ? 'Admin' : 'Funcionário'}
                  </span>
                ) : (
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1 shrink-0">
                    <button
                      onClick={() => !isAdmin && alterarRole(u.id, 'admin')}
                      disabled={salvando === u.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isAdmin ? 'bg-brand-navy text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>
                      Admin
                    </button>
                    <button
                      onClick={() => isAdmin && alterarRole(u.id, 'funcionario')}
                      disabled={salvando === u.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!isAdmin ? 'bg-brand-navy text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>
                      Funcionário
                    </button>
                  </div>
                )}
              </div>

              {salvando === u.id && (
                <p className="text-xs text-gray-400 mt-2 text-center">Salvando...</p>
              )}
            </div>
          )
        })}

        {usuarios.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
        <p className="text-xs text-blue-700 font-medium">ℹ️ Sobre os perfis</p>
        <p className="text-xs text-blue-600 mt-1">
          <strong>Admin</strong> — acesso completo: vendas, entregas, clientes, financeiro, relatórios e configurações.<br />
          <strong>Funcionário</strong> — coleta, mortalidade, lotes e preparação de pedidos.
        </p>
      </div>
    </div>
  )
}
