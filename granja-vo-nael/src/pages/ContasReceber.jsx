import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const today = new Date().toISOString().split('T')[0]

function statusPagamento(venda) {
  if (venda.status_pagamento === 'pago') return { label: 'Pago', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  if (venda.data_vencimento && venda.data_vencimento < today) return { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
}

export default function ContasReceber() {
  const [vendas, setVendas] = useState([])
  const [filtro, setFiltro] = useState('pendente')

  useEffect(() => { loadVendas() }, [])

  async function loadVendas() {
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome), pequeno, grande, extra_grande, jumbo, tipo_pequeno, tipo_grande, tipo_extra_grande, tipo_jumbo, preco_pequeno, preco_grande, preco_extra_grande, preco_jumbo')
      .order('data_vencimento', { ascending: true, nullsFirst: false })
      .order('data', { ascending: false })
    setVendas(data || [])
  }

  const CLASSIFS = ['pequeno', 'grande', 'extra_grande', 'jumbo']
  const MULT = { unidade: 1, cartela12: 12, cartela30: 30 }

  function calcTotal(v) {
    const sub = CLASSIFS.reduce((s, k) => {
      const mult = MULT[v[`tipo_${k}`]] || 1
      const cartelas = mult > 0 ? Math.round((v[k] || 0) / mult) : (v[k] || 0)
      return s + cartelas * (Number(v[`preco_${k}`]) || 0)
    }, 0)
    return sub + Number(v.frete || 0)
  }

  async function marcarPago(id) {
    await supabase.from('vendas').update({
      status_pagamento: 'pago',
      data_pagamento: today,
    }).eq('id', id)
    loadVendas()
  }

  async function setVencimento(id, data) {
    await supabase.from('vendas').update({ data_vencimento: data }).eq('id', id)
    loadVendas()
  }

  const todas = vendas.filter(v => {
    const st = statusPagamento(v)
    if (filtro === 'pendente') return st.label === 'Pendente'
    if (filtro === 'atrasado') return st.label === 'Atrasado'
    if (filtro === 'pago') return st.label === 'Pago'
    return true
  })

  const totalPendente = vendas
    .filter(v => statusPagamento(v).label !== 'Pago')
    .reduce((s, v) => s + calcTotal(v), 0)

  const totalAtrasado = vendas
    .filter(v => statusPagamento(v).label === 'Atrasado')
    .reduce((s, v) => s + calcTotal(v), 0)

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-brand-navy text-xl font-bold">Contas a Receber</h1>
        <p className="text-sm text-gray-500">Pendente: <span className="font-semibold text-yellow-600">R$ {totalPendente.toFixed(2)}</span></p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-yellow-600 font-medium">A receber</p>
          <p className="text-xl font-bold text-yellow-700">R$ {totalPendente.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-red-600 font-medium">Atrasado</p>
          <p className="text-xl font-bold text-red-700">R$ {totalAtrasado.toFixed(2)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['pendente', 'atrasado', 'pago', 'todas'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition capitalize
            ${filtro === f ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {todas.map(v => {
          const st = statusPagamento(v)
          const StIcon = st.icon
          const total = calcTotal(v)
          return (
            <div key={v.id} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-brand-navy text-sm">{v.clientes?.nome ?? 'Sem cliente'}</p>
                  <p className="text-xs text-gray-400">Venda: {new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  <p className="text-green-600 font-bold text-lg">R$ {total.toFixed(2)}</p>
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium ${st.color}`}>
                  <StIcon size={12} />
                  {st.label}
                </span>
              </div>

              {/* Vencimento */}
              {st.label !== 'Pago' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Vencimento:</label>
                  <input type="date" defaultValue={v.data_vencimento || ''}
                    onBlur={e => e.target.value && setVencimento(v.id, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-xs" />
                </div>
              )}

              {v.status_pagamento === 'pago' && v.data_pagamento && (
                <p className="text-xs text-green-600">Pago em {new Date(v.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              )}

              {st.label !== 'Pago' && (
                <button onClick={() => marcarPago(v.id)}
                  className="w-full bg-green-500 text-white py-2 rounded-xl text-xs font-semibold">
                  Marcar como Pago
                </button>
              )}
            </div>
          )
        })}
        {todas.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma conta neste filtro</p>
          </div>
        )}
      </div>
    </div>
  )
}
