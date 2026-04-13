import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, ShoppingCart, Trash2, AlertTriangle } from 'lucide-react'

const CLASSIFICACOES = ['pequeno', 'grande', 'extra_grande', 'jumbo']
const LABELS = { pequeno: 'Pequeno', grande: 'Grande', extra_grande: 'Extra Grande', jumbo: 'Jumbo' }
const TIPOS = [
  { value: 'unidade', label: 'Unidade', mult: 1 },
  { value: 'cartela12', label: 'Cartela 12', mult: 12 },
  { value: 'cartela30', label: 'Cartela 30', mult: 30 },
]
const today = new Date().toISOString().split('T')[0]

function tipoMult(tipo) {
  return TIPOS.find(t => t.value === tipo)?.mult ?? 1
}

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
    tipo_pequeno: 'unidade', tipo_grande: 'unidade', tipo_extra_grande: 'unidade', tipo_jumbo: 'unidade',
    preco_pequeno: '', preco_grande: '', preco_extra_grande: '', preco_jumbo: '',
    frete: '', observacoes: ''
  })
  const [addEntrega, setAddEntrega] = useState(false)
  const [dataEntrega, setDataEntrega] = useState(today)
  const [horaEntrega, setHoraEntrega] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [v, c, col] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome,tipo,endereco)').order('data', { ascending: false }).limit(30),
      supabase.from('clientes').select('id,nome,tipo,endereco').eq('ativo', true).order('nome'),
      supabase.from('coletas').select('pequeno,grande,extra_grande,jumbo,trincados,perdas'),
    ])
    setVendas(v.data || [])
    setClientes(c.data || [])

    const coletado = (col.data || []).reduce(
      (s, r) => ({ pequeno: s.pequeno + r.pequeno, grande: s.grande + r.grande, extra_grande: s.extra_grande + r.extra_grande, jumbo: s.jumbo + r.jumbo }),
      { pequeno: 0, grande: 0, extra_grande: 0, jumbo: 0 }
    )
    const vendido = (v.data || []).reduce(
      (s, r) => ({ pequeno: s.pequeno + r.pequeno, grande: s.grande + r.grande, extra_grande: s.extra_grande + r.extra_grande, jumbo: s.jumbo + r.jumbo }),
      { pequeno: 0, grande: 0, extra_grande: 0, jumbo: 0 }
    )
    setEstoque({
      pequeno: Math.max(0, coletado.pequeno - vendido.pequeno),
      grande: Math.max(0, coletado.grande - vendido.grande),
      extra_grande: Math.max(0, coletado.extra_grande - vendido.extra_grande),
      jumbo: Math.max(0, coletado.jumbo - vendido.jumbo),
    })
  }

  // Converte quantidade digitada para ovos (considerando tipo de embalagem)
  function qtdEmOvos(k) {
    const tipo = form[`tipo_${k}`]
    return (Number(form[k]) || 0) * tipoMult(tipo)
  }

  // Total = quantidade de cartelas/unidades × preço por cartela/unidade
  function calcTotal() {
    const subtotal = CLASSIFICACOES.reduce((s, k) => s + (Number(form[k]) || 0) * (Number(form[`preco_${k}`]) || 0), 0)
    return subtotal + (Number(form.frete) || 0)
  }

  // Alertas onde ovos calculados superam estoque
  const alertasEstoque = CLASSIFICACOES.filter(k => qtdEmOvos(k) > estoque[k] && qtdEmOvos(k) > 0)

  // Endereço do cliente selecionado
  const clienteSelecionado = clientes.find(c => c.id === form.cliente_id)

  async function handleSave(e) {
    e.preventDefault()
    if (alertasEstoque.length > 0) {
      const nomes = alertasEstoque.map(k => LABELS[k]).join(', ')
      if (!confirm(`Atenção: a quantidade de ${nomes} ultrapassa o estoque disponível. Deseja continuar mesmo assim?`)) return
    }
    setSaving(true)
    const subtotal = CLASSIFICACOES.reduce((s, k) => s + (Number(form[k]) || 0) * (Number(form[`preco_${k}`]) || 0), 0)
    const payload = {
      data: form.data,
      cliente_id: form.cliente_id || null,
      pequeno: qtdEmOvos('pequeno'),
      grande: qtdEmOvos('grande'),
      extra_grande: qtdEmOvos('extra_grande'),
      jumbo: qtdEmOvos('jumbo'),
      tipo_pequeno: form.tipo_pequeno,
      tipo_grande: form.tipo_grande,
      tipo_extra_grande: form.tipo_extra_grande,
      tipo_jumbo: form.tipo_jumbo,
      preco_pequeno: Number(form.preco_pequeno) || 0,
      preco_grande: Number(form.preco_grande) || 0,
      preco_extra_grande: Number(form.preco_extra_grande) || 0,
      preco_jumbo: Number(form.preco_jumbo) || 0,
      frete: Number(form.frete) || 0,
      total: subtotal,
      observacoes: form.observacoes || null,
      user_id: user.id,
    }
    const { data: venda, error } = await supabase.from('vendas').insert(payload).select().single()

    if (error) {
      alert('Erro ao salvar venda: ' + error.message)
      setSaving(false)
      return
    }

    if (addEntrega && venda) {
      await supabase.from('entregas').insert({
        venda_id: venda.id,
        status: 'pendente',
        data_prevista: dataEntrega,
        hora_prevista: horaEntrega || null,
        endereco: clienteSelecionado?.endereco || null,
        user_id: user.id,
      })
    }

    setForm({ data: today, cliente_id: '', pequeno: '', grande: '', extra_grande: '', jumbo: '', tipo_pequeno: 'unidade', tipo_grande: 'unidade', tipo_extra_grande: 'unidade', tipo_jumbo: 'unidade', preco_pequeno: '', preco_grande: '', preco_extra_grande: '', preco_jumbo: '', frete: '', observacoes: '' })
    setAddEntrega(false)
    setDataEntrega(today)
    setHoraEntrega('')
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta venda?')) return
    await supabase.from('vendas').delete().eq('id', id)
    loadAll()
  }

  // Calcula o total de uma venda (compatível com registros antigos sem campo total)
  function calcVendaTotal(v) {
    if (Number(v.total) > 0) return Number(v.total) + Number(v.frete || 0)
    // Fallback para registros antigos: recalcula pelos preços e quantidades armazenadas
    const sub = CLASSIFICACOES.reduce((s, k) => {
      const mult = tipoMult(v[`tipo_${k}`] || 'unidade')
      const cartelas = mult > 0 ? Math.round((v[k] || 0) / mult) : (v[k] || 0)
      return s + cartelas * (Number(v[`preco_${k}`]) || 0)
    }, 0)
    return sub + Number(v.frete || 0)
  }

  const totalMes = vendas
    .filter(v => v.data?.startsWith(today.slice(0, 7)))
    .reduce((s, v) => s + calcVendaTotal(v), 0)

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

          {/* Classificações com tipo de embalagem */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">Ovos vendidos</p>
            <div className="space-y-3">
              {CLASSIFICACOES.map(k => {
                const tipo = form[`tipo_${k}`]
                const qtdOvos = qtdEmOvos(k)
                const excedeu = qtdOvos > estoque[k] && qtdOvos > 0
                const tipoLabel = TIPOS.find(t => t.value === tipo)?.label
                return (
                  <div key={k} className="border border-gray-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brand-navy">{LABELS[k]}</span>
                      <span className={`text-xs ${excedeu ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        estoque: {estoque[k]} ovos
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Embalagem</label>
                        <select value={tipo} onChange={e => setForm(f => ({ ...f, [`tipo_${k}`]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-xl px-2 py-2 text-xs mt-1 bg-white">
                          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Qtd ({tipoLabel})</label>
                        <input type="number" min="0" value={form[k]}
                          onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                          placeholder="0"
                          className={`w-full border rounded-xl px-2 py-2 text-sm mt-1 ${excedeu ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Preço / {tipoLabel}</label>
                        <input type="number" min="0" step="0.01" value={form[`preco_${k}`]}
                          onChange={e => setForm(f => ({ ...f, [`preco_${k}`]: e.target.value }))}
                          placeholder="0,00"
                          className="w-full border border-gray-300 rounded-xl px-2 py-2 text-sm mt-1" />
                      </div>
                    </div>
                    {qtdOvos > 0 && (
                      <p className="text-xs text-gray-400">= {qtdOvos} ovos · R$ {((Number(form[k]) || 0) * (Number(form[`preco_${k}`]) || 0)).toFixed(2)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Alerta de estoque */}
          {alertasEstoque.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 items-start">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-700 text-xs font-semibold">Estoque insuficiente</p>
                <p className="text-red-600 text-xs mt-0.5">
                  {alertasEstoque.map(k => `${LABELS[k]}: ${qtdEmOvos(k)} vendidos / ${estoque[k]} disponíveis`).join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* Frete */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Frete (R$) — deixe 0 se não cobrar</label>
            <input type="number" min="0" step="0.01" value={form.frete}
              onChange={e => setForm(f => ({ ...f, frete: e.target.value }))}
              placeholder="0,00"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
          </div>

          {/* Total */}
          <div className="bg-brand-orange/10 rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ovos</span>
              <span>R$ {(calcTotal() - (Number(form.frete) || 0)).toFixed(2)}</span>
            </div>
            {Number(form.frete) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Frete</span>
                <span>R$ {Number(form.frete).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brand-navy border-t border-brand-orange/20 pt-1 mt-1">
              <span>Total</span>
              <span className="text-brand-orange text-lg">R$ {calcTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Entrega */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={addEntrega} onChange={e => setAddEntrega(e.target.checked)} className="rounded" />
              Agendar entrega para esta venda
            </label>
            {addEntrega && (
              <div className="grid grid-cols-2 gap-3 pl-5">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Data da entrega</label>
                  <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Hora</label>
                  <input type="time" value={horaEntrega} onChange={e => setHoraEntrega(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                {clienteSelecionado?.endereco && (
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-blue-600 font-medium">Endereço do cliente:</p>
                    <p className="text-xs text-blue-800 mt-0.5">{clienteSelecionado.endereco}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} placeholder="Opcional..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 resize-none" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
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
                <p className="text-green-600 font-bold text-lg mt-1">
                  R$ {calcVendaTotal(v).toFixed(2)}
                  {v.frete > 0 && <span className="text-xs text-gray-400 font-normal ml-1">(+ R$ {Number(v.frete).toFixed(2)} frete)</span>}
                </p>
              </div>
              <button onClick={() => handleDelete(v.id)} className="text-red-400 p-1"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {CLASSIFICACOES.map(k => v[k] > 0 && (
                <div key={k} className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-xs text-gray-400">{LABELS[k]}</p>
                  <p className="font-semibold text-gray-800 text-sm">{v[k]}</p>
                  <p className="text-xs text-gray-400">{TIPOS.find(t => t.value === v[`tipo_${k}`])?.label ?? 'un'}</p>
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
