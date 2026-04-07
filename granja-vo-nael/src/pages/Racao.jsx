import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Wheat, DollarSign, Trash2 } from 'lucide-react'

const CATEGORIAS_CUSTO = [
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'energia', label: 'Energia' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'outro', label: 'Outro' },
]

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

export default function Racao() {
  const { user } = useAuth()
  const [racoes, setRacoes] = useState([])
  const [custos, setCustos] = useState([])
  const [tab, setTab] = useState('racao')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formRacao, setFormRacao] = useState({ data: today, tipo: '', quantidade_kg: '', custo_total: '', fornecedor: '', observacoes: '' })
  const [formCusto, setFormCusto] = useState({ data: today, descricao: '', categoria: 'outro', valor: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [r, c] = await Promise.all([
      supabase.from('racao').select('*').order('data', { ascending: false }).limit(30),
      supabase.from('custos').select('*').order('data', { ascending: false }).limit(30),
    ])
    setRacoes(r.data || [])
    setCustos(c.data || [])
  }

  async function handleSaveRacao(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('racao').insert({
      data: formRacao.data,
      tipo: formRacao.tipo,
      quantidade_kg: Number(formRacao.quantidade_kg),
      custo_total: Number(formRacao.custo_total),
      fornecedor: formRacao.fornecedor || null,
      observacoes: formRacao.observacoes || null,
      user_id: user.id,
    })
    setFormRacao({ data: today, tipo: '', quantidade_kg: '', custo_total: '', fornecedor: '', observacoes: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function handleSaveCusto(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('custos').insert({
      data: formCusto.data,
      descricao: formCusto.descricao,
      categoria: formCusto.categoria,
      valor: Number(formCusto.valor),
      user_id: user.id,
    })
    setFormCusto({ data: today, descricao: '', categoria: 'outro', valor: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  const totalRacaoMes = racoes.filter(r => r.data?.startsWith(thisMonth)).reduce((s, r) => s + Number(r.custo_total || 0), 0)
  const totalCustosMes = custos.filter(c => c.data?.startsWith(thisMonth)).reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalGeral = totalRacaoMes + totalCustosMes

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Ração & Custos</h1>
          <p className="text-sm text-gray-500">Total este mês: <span className="font-semibold text-red-600">R$ {totalGeral.toFixed(2)}</span></p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
          <Plus size={18} /> Novo
        </button>
      </div>

      {/* Resumo mensal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-amber-600 font-medium">Ração</p>
          <p className="text-xl font-bold text-amber-700">R$ {totalRacaoMes.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-red-600 font-medium">Outros Custos</p>
          <p className="text-xl font-bold text-red-700">R$ {totalCustosMes.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 rounded-xl p-1">
        <button onClick={() => setTab('racao')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'racao' ? 'bg-white text-brand-navy shadow' : 'text-gray-500'}`}>
          Ração
        </button>
        <button onClick={() => setTab('custos')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'custos' ? 'bg-white text-brand-navy shadow' : 'text-gray-500'}`}>
          Outros Custos
        </button>
      </div>

      {showForm && tab === 'racao' && (
        <form onSubmit={handleSaveRacao} className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Compra de Ração</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Data</label>
              <input type="date" value={formRacao.data} onChange={e => setFormRacao(f => ({ ...f, data: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Tipo</label>
              <input value={formRacao.tipo} onChange={e => setFormRacao(f => ({ ...f, tipo: e.target.value }))} required
                placeholder="Ex: Postura 1"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Qtd (kg)</label>
              <input type="number" min="0" step="0.1" value={formRacao.quantidade_kg}
                onChange={e => setFormRacao(f => ({ ...f, quantidade_kg: e.target.value }))} required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Custo total (R$)</label>
              <input type="number" min="0" step="0.01" value={formRacao.custo_total}
                onChange={e => setFormRacao(f => ({ ...f, custo_total: e.target.value }))} required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Fornecedor</label>
            <input value={formRacao.fornecedor} onChange={e => setFormRacao(f => ({ ...f, fornecedor: e.target.value }))}
              placeholder="Opcional"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
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

      {showForm && tab === 'custos' && (
        <form onSubmit={handleSaveCusto} className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Novo Custo</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Data</label>
              <input type="date" value={formCusto.data} onChange={e => setFormCusto(f => ({ ...f, data: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Categoria</label>
              <select value={formCusto.categoria} onChange={e => setFormCusto(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                {CATEGORIAS_CUSTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Descrição</label>
              <input value={formCusto.descricao} onChange={e => setFormCusto(f => ({ ...f, descricao: e.target.value }))} required
                placeholder="O que foi comprado?"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Valor (R$)</label>
              <input type="number" min="0" step="0.01" value={formCusto.valor}
                onChange={e => setFormCusto(f => ({ ...f, valor: e.target.value }))} required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
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

      {tab === 'racao' && (
        <div className="space-y-3">
          {racoes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-brand-navy text-sm">{r.tipo}</p>
                  <p className="text-xs text-gray-400">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}{r.fornecedor ? ` · ${r.fornecedor}` : ''}</p>
                  <p className="text-sm text-gray-600 mt-1">{r.quantidade_kg} kg</p>
                </div>
                <p className="text-amber-600 font-bold">R$ {Number(r.custo_total).toFixed(2)}</p>
              </div>
            </div>
          ))}
          {racoes.length === 0 && <div className="text-center py-10 text-gray-400"><Wheat size={36} className="mx-auto mb-2 opacity-30" /><p>Nenhum registro de ração</p></div>}
        </div>
      )}

      {tab === 'custos' && (
        <div className="space-y-3">
          {custos.map(c => (
            <div key={c.id} className="bg-white rounded-2xl shadow p-4 flex justify-between">
              <div>
                <p className="font-semibold text-brand-navy text-sm">{c.descricao}</p>
                <p className="text-xs text-gray-400">{new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {CATEGORIAS_CUSTO.find(k => k.value === c.categoria)?.label}
                </span>
              </div>
              <p className="text-red-600 font-bold">R$ {Number(c.valor).toFixed(2)}</p>
            </div>
          ))}
          {custos.length === 0 && <div className="text-center py-10 text-gray-400"><DollarSign size={36} className="mx-auto mb-2 opacity-30" /><p>Nenhum custo registrado</p></div>}
        </div>
      )}
    </div>
  )
}
