import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Truck, CheckCircle, Clock, Navigation, XCircle } from 'lucide-react'

const STATUS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { value: 'em_rota', label: 'Em Rota', color: 'bg-blue-100 text-blue-700', icon: Navigation },
  { value: 'entregue', label: 'Entregue', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
]

export default function Entregas() {
  const { isAdmin } = useAuth()
  const [entregas, setEntregas] = useState([])
  const [filtro, setFiltro] = useState('pendente')

  useEffect(() => { loadEntregas() }, [])

  async function loadEntregas() {
    const { data } = await supabase
      .from('entregas')
      .select('*, vendas(data, total, clientes(nome))')
      .order('created_at', { ascending: false })
      .limit(50)
    setEntregas(data || [])
  }

  async function updateStatus(id, status) {
    const update = { status }
    if (status === 'entregue') update.data_entrega = new Date().toISOString().split('T')[0]
    await supabase.from('entregas').update(update).eq('id', id)
    loadEntregas()
  }

  async function updateEndereco(id, endereco) {
    await supabase.from('entregas').update({ endereco }).eq('id', id)
  }

  const filtradas = filtro === 'todas' ? entregas : entregas.filter(e => e.status === filtro)

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-brand-navy text-xl font-bold">Entregas</h1>
        <p className="text-sm text-gray-500">
          {entregas.filter(e => e.status === 'pendente').length} pendentes ·{' '}
          {entregas.filter(e => e.status === 'em_rota').length} em rota
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['pendente', 'em_rota', 'entregue', 'todas'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition
            ${filtro === f ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f === 'todas' ? 'Todas' : STATUS.find(s => s.value === f)?.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtradas.map(e => {
          const statusInfo = STATUS.find(s => s.value === e.status)
          const StatusIcon = statusInfo?.icon ?? Clock
          return (
            <div key={e.id} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-brand-navy text-sm">
                    {e.vendas?.clientes?.nome ?? 'Sem cliente'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Venda: {e.vendas?.data ? new Date(e.vendas.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    {e.vendas?.total ? ` · R$ ${Number(e.vendas.total).toFixed(2)}` : ''}
                  </p>
                  {e.data_prevista && (
                    <p className="text-xs text-gray-400">
                      Prev: {new Date(e.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium ${statusInfo?.color}`}>
                  <StatusIcon size={12} />
                  {statusInfo?.label}
                </span>
              </div>

              {e.endereco && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">{e.endereco}</p>
              )}

              {/* Ações de status */}
              {e.status === 'pendente' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(e.id, 'em_rota')}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-xs font-medium">
                    Saiu para entrega
                  </button>
                  <button onClick={() => updateStatus(e.id, 'cancelada')}
                    className="px-3 py-2 border border-red-200 text-red-500 rounded-xl text-xs font-medium">
                    Cancelar
                  </button>
                </div>
              )}
              {e.status === 'em_rota' && (
                <button onClick={() => updateStatus(e.id, 'entregue')}
                  className="w-full bg-green-500 text-white py-2 rounded-xl text-xs font-semibold">
                  Confirmar Entrega
                </button>
              )}
              {e.status === 'entregue' && e.data_entrega && (
                <p className="text-xs text-green-600">
                  Entregue em {new Date(e.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )
        })}
        {filtradas.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Truck size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma entrega {filtro !== 'todas' ? `com status "${STATUS.find(s => s.value === filtro)?.label}"` : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
