import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, Clock, Navigation, XCircle, MapPin, MessageCircle, Truck, Calendar } from 'lucide-react'

const STATUS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { value: 'em_rota', label: 'Em Rota', color: 'bg-blue-100 text-blue-700', icon: Navigation },
  { value: 'entregue', label: 'Entregue', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
]

const CLASSIFICACOES = ['pequeno', 'grande', 'extra_grande', 'jumbo']
const MULT = { unidade: 1, cartela12: 12, cartela30: 30 }
const today = new Date().toISOString().split('T')[0]

export default function Entregas() {
  const [entregas, setEntregas] = useState([])
  const [filtro, setFiltro] = useState('hoje')
  const [telefonePai, setTelefonePai] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [e, cfg] = await Promise.all([
      supabase.from('entregas')
        .select('*, vendas(data, total, frete, pequeno, grande, extra_grande, jumbo, tipo_pequeno, tipo_grande, tipo_extra_grande, tipo_jumbo, preco_pequeno, preco_grande, preco_extra_grande, preco_jumbo, clientes(nome, endereco))')
        .order('data_prevista', { ascending: true })
        .order('hora_prevista', { ascending: true })
        .limit(60),
      supabase.from('configuracoes').select('telefone_pai').eq('id', 1).single(),
    ])
    setEntregas(e.data || [])
    if (cfg.data?.telefone_pai) setTelefonePai(cfg.data.telefone_pai)
  }

  function calcValorVenda(v) {
    if (!v) return 0
    const sub = CLASSIFICACOES.reduce((s, k) => {
      const mult = MULT[v[`tipo_${k}`]] || 1
      const cartelas = mult > 0 ? Math.round((v[k] || 0) / mult) : (v[k] || 0)
      return s + cartelas * (Number(v[`preco_${k}`]) || 0)
    }, 0)
    return sub + Number(v.frete || 0)
  }

  async function updateStatus(id, status) {
    const update = { status }
    if (status === 'entregue') update.data_entrega = today
    await supabase.from('entregas').update(update).eq('id', id)
    loadAll()
  }

  function enviarWhatsApp() {
    const entregasHoje = entregas.filter(e =>
      e.data_prevista === today && e.status !== 'cancelada' && e.status !== 'entregue'
    )

    if (entregasHoje.length === 0) {
      alert('Nenhuma entrega pendente para hoje.')
      return
    }

    const linhas = entregasHoje.map((e, i) => {
      const hora = e.hora_prevista ? ` às ${e.hora_prevista}` : ''
      const cliente = e.vendas?.clientes?.nome ?? 'Sem cliente'
      const endereco = e.endereco ?? e.vendas?.clientes?.endereco ?? 'Sem endereço'
      const valor = calcValorVenda(e.vendas)
      return `${i + 1}. ${cliente}${hora}\n   📍 ${endereco}\n   💰 R$ ${valor.toFixed(2)}`
    }).join('\n\n')

    const msg = `🐔 *Entregas de hoje - ${new Date().toLocaleDateString('pt-BR')}*\n\n${linhas}\n\nTotal: ${entregasHoje.length} entrega(s)`
    const encoded = encodeURIComponent(msg)
    const numero = telefonePai.replace(/\D/g, '')
    const url = numero
      ? `https://wa.me/55${numero}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  // Agrupamentos
  const entregasHoje = entregas.filter(e => e.data_prevista === today)
  const hojeAtivas = entregasHoje.filter(e => !['cancelada', 'entregue'].includes(e.status))
  const hoje_pendentes = entregasHoje.filter(e => e.status === 'pendente').length
  const hoje_em_rota = entregasHoje.filter(e => e.status === 'em_rota').length
  const hoje_entregues = entregasHoje.filter(e => e.status === 'entregue').length
  const totalHoje = entregasHoje.reduce((s, e) => s + calcValorVenda(e.vendas), 0)

  const filtradas =
    filtro === 'hoje' ? entregasHoje :
    filtro === 'todas' ? entregas :
    entregas.filter(e => e.status === filtro)

  const FILTROS = [
    { key: 'hoje', label: `Hoje${hojeAtivas.length > 0 ? ` (${hojeAtivas.length})` : ''}` },
    { key: 'pendente', label: 'Pendente' },
    { key: 'em_rota', label: 'Em Rota' },
    { key: 'entregue', label: 'Entregue' },
    { key: 'todas', label: 'Todas' },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Entregas</h1>
          <p className="text-sm text-gray-500">
            {entregas.filter(e => e.status === 'pendente').length} pendentes ·{' '}
            {entregas.filter(e => e.status === 'em_rota').length} em rota
          </p>
        </div>
      </div>

      {/* Banner do dia */}
      {filtro === 'hoje' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-brand-orange" />
              <p className="font-semibold text-brand-navy text-sm">Hoje — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
            </div>
            <button onClick={enviarWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition">
              <MessageCircle size={14} />
              WhatsApp
              {hojeAtivas.length > 0 && (
                <span className="bg-white/30 rounded-full px-1.5 py-0.5 text-xs">{hojeAtivas.length}</span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2 text-center">
              <p className="text-yellow-600 text-xs font-medium">Pendentes</p>
              <p className="text-brand-navy font-bold text-xl">{hoje_pendentes}</p>
            </div>
            <div className="bg-blue-100 border border-blue-200 rounded-xl p-2 text-center">
              <p className="text-blue-600 text-xs font-medium">Em Rota</p>
              <p className="text-brand-navy font-bold text-xl">{hoje_em_rota}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-center">
              <p className="text-green-600 text-xs font-medium">Entregues</p>
              <p className="text-brand-navy font-bold text-xl">{hoje_entregues}</p>
            </div>
          </div>

          {totalHoje > 0 && (
            <p className="text-xs text-gray-500 text-center">
              Total do dia: <span className="text-green-600 font-bold">R$ {totalHoje.toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition
            ${filtro === f.key ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtradas.map(e => {
          const statusInfo = STATUS.find(s => s.value === e.status)
          const StatusIcon = statusInfo?.icon ?? Clock
          const endereco = e.endereco ?? e.vendas?.clientes?.endereco
          const valor = calcValorVenda(e.vendas)
          const isHoje = e.data_prevista === today

          return (
            <div key={e.id} className={`bg-white rounded-2xl shadow p-4 space-y-3 ${isHoje && ['pendente','em_rota'].includes(e.status) ? 'border-2 border-brand-orange' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-brand-navy text-sm">
                    {e.vendas?.clientes?.nome ?? 'Sem cliente'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {e.data_prevista ? new Date(e.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    {e.hora_prevista ? ` às ${e.hora_prevista}` : ''}
                  </p>
                  {valor > 0 && <p className="text-xs text-green-600 font-medium mt-0.5">R$ {valor.toFixed(2)}</p>}
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium ${statusInfo?.color}`}>
                  <StatusIcon size={12} />
                  {statusInfo?.label}
                </span>
              </div>

              {endereco && (
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <MapPin size={14} className="text-brand-orange mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">{endereco}</p>
                </div>
              )}

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
            <p className="text-sm">
              {filtro === 'hoje' ? 'Nenhuma entrega agendada para hoje' : 'Nenhuma entrega encontrada'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
