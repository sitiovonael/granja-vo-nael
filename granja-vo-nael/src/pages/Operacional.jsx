import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Droplets, TrendingUp, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)
const TIPOS_EMBALAGEM = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'cartela12', label: 'Cartela 12' },
  { value: 'cartela30', label: 'Cartela 30' },
]
const CLASSIFICACOES = ['pequeno', 'grande', 'extra_grande', 'jumbo']
const LABELS = { pequeno: 'Pequeno', grande: 'Grande', extra_grande: 'Extra Grande', jumbo: 'Jumbo' }

export default function Operacional() {
  const { user } = useAuth()
  const [tab, setTab] = useState('agua')
  const [aguas, setAguas] = useState([])
  const [precos, setPrecos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formAgua, setFormAgua] = useState({ data: today, litros: '', observacoes: '' })
  const [formPreco, setFormPreco] = useState({ data: today, tipo: 'unidade', pequeno: '', grande: '', extra_grande: '', jumbo: '', observacoes: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [a, p] = await Promise.all([
      supabase.from('agua').select('*').order('data', { ascending: false }).limit(30),
      supabase.from('precos').select('*').order('data', { ascending: false }).limit(50),
    ])
    setAguas(a.data || [])
    setPrecos(p.data || [])
  }

  async function saveAgua(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('agua').insert({ data: formAgua.data, litros: Number(formAgua.litros), observacoes: formAgua.observacoes || null, user_id: user.id })
    setFormAgua({ data: today, litros: '', observacoes: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function savePreco(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('precos').insert({
      data: formPreco.data,
      tipo: formPreco.tipo,
      pequeno: Number(formPreco.pequeno) || 0,
      grande: Number(formPreco.grande) || 0,
      extra_grande: Number(formPreco.extra_grande) || 0,
      jumbo: Number(formPreco.jumbo) || 0,
      observacoes: formPreco.observacoes || null,
      user_id: user.id,
    })
    setFormPreco({ data: today, tipo: 'unidade', pequeno: '', grande: '', extra_grande: '', jumbo: '', observacoes: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  // Média de água últimos 7 dias
  const ultimos7 = aguas.slice(0, 7)
  const mediaAgua = ultimos7.length > 0 ? ultimos7.reduce((s, a) => s + Number(a.litros), 0) / ultimos7.length : 0
  const ultimaAgua = aguas[0]
  const alertaAgua = ultimaAgua && mediaAgua > 0 && Number(ultimaAgua.litros) < mediaAgua * 0.8

  // Gráfico de água
  const dadosAgua = [...aguas].reverse().slice(-14).map(a => ({
    dia: a.data.slice(5).replace('-', '/'),
    litros: Number(a.litros),
  }))

  // Gráfico de preços (grande como referência)
  const dadosPrecos = [...precos].reverse().slice(-10).map(p => ({
    data: p.data.slice(5).replace('-', '/'),
    Pequeno: Number(p.pequeno),
    Grande: Number(p.grande),
    'Extra Grande': Number(p.extra_grande),
    Jumbo: Number(p.jumbo),
    tipo: p.tipo,
  }))

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-brand-navy text-xl font-bold">Operacional</h1>

      <div className="flex bg-gray-200 rounded-xl p-1">
        <button onClick={() => setTab('agua')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'agua' ? 'bg-white text-brand-navy shadow' : 'text-gray-500'}`}>
          Água
        </button>
        <button onClick={() => setTab('precos')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'precos' ? 'bg-white text-brand-navy shadow' : 'text-gray-500'}`}>
          Preços
        </button>
      </div>

      {/* ÁGUA */}
      {tab === 'agua' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Média: <span className="font-semibold text-blue-600">{mediaAgua.toFixed(0)} L/dia</span></p>
            <button onClick={() => setShowForm(!showForm)}
              className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium">
              <Plus size={18} /> Registrar
            </button>
          </div>

          {alertaAgua && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3 items-start">
              <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-orange-700 font-semibold text-sm">Consumo de água abaixo do normal</p>
                <p className="text-orange-600 text-xs mt-0.5">
                  Hoje: {ultimaAgua.litros}L · Média: {mediaAgua.toFixed(0)}L. Queda no consumo pode indicar doença ou problema no bebedouro.
                </p>
              </div>
            </div>
          )}

          {showForm && (
            <form onSubmit={saveAgua} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Data</label>
                  <input type="date" value={formAgua.data} onChange={e => setFormAgua(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Litros consumidos</label>
                  <input type="number" min="0" step="0.1" value={formAgua.litros}
                    onChange={e => setFormAgua(f => ({ ...f, litros: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Observações</label>
                <input value={formAgua.observacoes} onChange={e => setFormAgua(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {dadosAgua.length > 1 && (
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-sm font-semibold text-brand-navy mb-3">Consumo de água (L)</h2>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={dadosAgua}>
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip />
                  <Line type="monotone" dataKey="litros" stroke="#3b82f6" strokeWidth={2} dot={false} name="Litros" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {aguas.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-brand-navy">{Number(a.litros)} litros</p>
                    {a.observacoes && <p className="text-xs text-gray-400">{a.observacoes}</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
            {aguas.length === 0 && <div className="text-center py-10 text-gray-400"><Droplets size={36} className="mx-auto mb-2 opacity-30" /><p>Nenhum registro de água</p></div>}
          </div>
        </div>
      )}

      {/* PREÇOS */}
      {tab === 'precos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)}
              className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium">
              <Plus size={18} /> Registrar preço
            </button>
          </div>

          {showForm && (
            <form onSubmit={savePreco} className="bg-white rounded-2xl shadow p-4 space-y-4">
              <h2 className="font-semibold text-brand-navy">Registrar Preços</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Data</label>
                  <input type="date" value={formPreco.data} onChange={e => setFormPreco(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Tipo</label>
                  <select value={formPreco.tipo} onChange={e => setFormPreco(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                    {TIPOS_EMBALAGEM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CLASSIFICACOES.map(k => (
                  <div key={k}>
                    <label className="text-xs text-gray-400">{LABELS[k]} (R$)</label>
                    <input type="number" min="0" step="0.001" value={formPreco[k]}
                      onChange={e => setFormPreco(f => ({ ...f, [k]: e.target.value }))}
                      placeholder="0,000"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {dadosPrecos.length > 1 && (
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-sm font-semibold text-brand-navy mb-3">Evolução de preços</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dadosPrecos}>
                  <XAxis dataKey="data" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip />
                  <Legend iconSize={10} />
                  <Line type="monotone" dataKey="Grande" stroke="#F5A624" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Extra Grande" stroke="#1E2B5E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Jumbo" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {precos.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-400">{new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')} · {TIPOS_EMBALAGEM.find(t => t.value === p.tipo)?.label}</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {CLASSIFICACOES.map(k => p[k] > 0 && (
                    <div key={k} className="bg-gray-50 rounded-xl p-1.5">
                      <p className="text-xs text-gray-400">{LABELS[k]}</p>
                      <p className="text-xs font-semibold text-brand-navy">R$ {Number(p[k]).toFixed(3)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {precos.length === 0 && <div className="text-center py-10 text-gray-400"><TrendingUp size={36} className="mx-auto mb-2 opacity-30" /><p>Nenhum preço registrado</p></div>}
          </div>
        </div>
      )}
    </div>
  )
}
