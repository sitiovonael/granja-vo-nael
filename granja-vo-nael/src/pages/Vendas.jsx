import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, ShoppingCart, Trash2, AlertTriangle } from 'lucide-react'

const CLASSIFICACOES = ['pequeno', 'grande', 'extra_grande', 'jumbo']
const LABELS = { pequeno: 'Pequeno', grande: 'Grande', extra_grande: 'Extra Grande', jumbo: 'Jumbo' }
const today = new Date().toISOString().split('T')[0]

export default function Vendas() {
  const { user } = useAuth()
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [estoque, setEstoque] = useState({ pequeno: 0, grande: 0, extra_grande: 0, jumbo: 0 })
  const [form, setForm] = useState({
    data: today, cliente_id: '',
    pequeno: '', grande: '', extra_grande: '', jumbo: '',
    preco_pequeno: '', preco_grande: '', preco_extra_grande: '', preco_jumbo: '',
    observacoes: ''
  })
  const [addEntrega, setAddEntrega] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [v, c, col] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome,tipo)').order('data', { ascending: false }).limit(30),
      supabase.from('clientes').select('id,nome,tipo').eq('ativo', true).order('nome'),
      supabase.from('coletas').select('pequeno,grande,extra_grande,jumbo,trincados,perdas'),
    ])
    setVendas(v.data || [])
    setClientes(c.data || [])

    // Calcula estoque: coletado - vendido - trincados - perdas
    const coletado = (col.data || []).reduce(
      (s, r) => ({ pequeno: s.pequeno + r.pequeno, grande: s.grande + r.grande, extra_grande: s.extra_grande + r.extra_grande, jumbo: s.jumbo + r.jumbo }),
      { pequeno: 0, grande: 0, extra_grande: 0, jumbo: 0 }
    )
    const perdas = (col.data || []).reduce((s, r) => s + r.trincados + r.perdas, 0)
    const vendido = (v.data || []).reduce(
      (s, r) => ({ pequeno: s.pequeno + r.pequeno, grande: s.grande + r.grande, extra_grande: s.extra_grande + r.extra_grande, jumbo: s.jumbo + r.jumbo }),
      { pequeno: 0, grande: 0, extra_grande: 0, jumbo: 0 }
    )
    // perdas são distribuídas proporcionalmente — simplificamos subtraindo do total
    setEstoque({
      pequeno: Math.max(0, coletado.pequeno - vendido.pequeno),
      grande: Math.max(0, coletado.grande - vendido.grande),
      extra_grande: Math.max(0, coletado.extra_grande - vendido.extra_grande),
      jumbo: Math.max(0, coletado.jumbo - vendido.jumbo),
    })
  }

  function calcTotal() {
    return CLASSIFICACOES.reduce((s, k) => {
      return s + (Number(form[k]) || 0) * (Number(form[`preco_${k}`]) || 0)
    }, 0)
  }

  // Classificações onde a quantidade digitada supera o estoque
  const alertasEstoque = CLASSIFICACOES.filter(k => (Number(form[k]) || 0) > estoque[k] && (Number(form[k]) || 0) > 0)

  async function handleSave(e) {
    e.preventDefault()
    if (alertasEstoque.length > 0) {
      const nomes = alertasEstoque.map(k => LABELS[k]).join(', ')
      if (!confirm(`Atenção: a quantidade de ${nomes} ultrapassa o estoque disponível. Deseja continuar mesmo assim?`)) return
    }
    setSaving(true)
    const payload = {
      data: form.data,
      cliente_id: form.cliente_id || null,
      pequeno: Number(form.pequeno) || 0,
      grande: Number(form.grande) || 0,
      extra_grande: Number(form.extra_grande) || 0,
      jumbo: Number(form.jumbo) || 0,
      preco_pequeno: Number(form.preco_pequeno) || 0,
      preco_grande: Number(form.preco_grande) || 0,
      preco_extra_grande: Number(form.preco_extra_grande) || 0,
      preco_jumbo: Number(form.preco_jumbo) || 0,
      observacoes: form.observacoes || null,
      user_id: user.id,
    }
    const { data: venda } = await supabase.from('vendas').insert(payload).select().single()

    if (addEntrega && venda) {
      await supabase.from('entregas').insert({
        venda_id: venda.id,
        status: 'pendente',
        data_prevista: form.data,
        user_id: user.id,
      })
    }

    setForm({ data: today, cliente_id: '', pequeno: '', grande: '', extra_grande: '', jumbo: '', preco_pequeno: '', preco_grande: '', preco_extra_grande: '', preco_jumbo: '', observacoes: '' })
    setAddEntrega(false)
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta venda?')) return
    await supabase.from('vendas').delete().eq('id', id)
    loadAll()
  }

  const totalMes = vendas
    .filter(v => v.data?.startsWith(today.slice(0, 7)))
    .reduce((s, v) => s + Number(v.total || 0), 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Vendas</h1>
          <p className="text-sm text-gray-500">Este mês: <span className="font-semibold text-green-600">R$ {totalMes.toFixed(2)}</span></p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
          <Plus size={18} /> Nova Venda
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Registrar Venda</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Cliente</label>
              <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                <option value="">Sem cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'pf' ? 'PF' : 'Empresa'})</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">Quantidades e Preços (por unidade)</p>
            <div className="space-y-2">
              {CLASSIFICACOES.map(k => {
                const qtd = Number(form[k]) || 0
                const disponivel = estoque[k]
                const excedeu = qtd > disponivel && qtd > 0
                return (
                  <div key={k} className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400">{LABELS[k]}</label>
                        <span className={`text-xs font-medium ${excedeu ? 'text-red-500' : 'text-gray-400'}`}>
                          estoque: {disponivel}
                        </span>
                      </div>
                      <input type="number" min="0" value={form[k]}
                        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                        placeholder="Qtd"
                        className={`w-full border rounded-xl px-3 py-2 text-sm mt-1 ${excedeu ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Preço unitário (R$)</label>
                      <input type="number" min="0" step="0.01" value={form[`preco_${k}`]}
                        onChange={e => setForm(f => ({ ...f, [`preco_${k}`]: e.target.value }))}
                        placeholder="0,00"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Alerta de estoque insuficiente */}
          {alertasEstoque.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 items-start">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-700 text-xs font-semibold">Estoque insuficiente</p>
                <p className="text-red-600 text-xs mt-0.5">
                  {alertasEstoque.map(k => `${LABELS[k]}: ${Number(form[k])} vendidos / ${estoque[k]} disponíveis`).join(' · ')}
                </p>
              </div>
            </div>
          )}

          <div className="bg-brand-orange/10 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-brand-navy">Total da venda</span>
            <span className="text-lg font-bold text-brand-orange">R$ {calcTotal().toFixed(2)}</span>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={addEntrega} onChange={e => setAddEntrega(e.target.checked)}
              className="rounded" />
            Criar entrega para esta venda
          </label>

          <div>
            <label className="text-xs text-gray-500 font-medium">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} placeholder="Opcional..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 resize-none" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {vendas.map(v => (
          <div key={v.id} className="bg-white rounded-2xl shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-brand-navy text-sm">
                  {new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {v.clientes?.nome ?? 'Sem cliente'} {v.clientes?.tipo ? `(${v.clientes.tipo === 'pf' ? 'PF' : 'Empresa'})` : ''}
                </p>
                <p className="text-green-600 font-bold text-lg mt-1">R$ {Number(v.total || 0).toFixed(2)}</p>
              </div>
              <button onClick={() => handleDelete(v.id)} className="text-red-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {CLASSIFICACOES.map(k => v[k] > 0 && (
                <div key={k} className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-xs text-gray-400">{LABELS[k]}</p>
                  <p className="font-semibold text-gray-800">{v[k]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {vendas.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma venda registrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
