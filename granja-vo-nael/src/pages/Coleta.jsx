import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Egg, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

const CLASSIFICACOES = ['pequeno', 'grande', 'extra_grande', 'jumbo']
const LABELS = { pequeno: 'Pequeno', grande: 'Grande', extra_grande: 'Extra Grande', jumbo: 'Jumbo' }
const TURNOS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
]

const today = new Date().toISOString().split('T')[0]

function totalOvos(coleta) {
  return CLASSIFICACOES.reduce((s, k) => s + (Number(coleta[k]) || 0), 0)
}

export default function Coleta() {
  const { user } = useAuth()
  const [coletas, setColetas] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    data: today, turno: 'manha',
    pequeno: '', grande: '', extra_grande: '', jumbo: '',
    trincados: '', perdas: '', observacoes: ''
  })

  useEffect(() => { loadColetas() }, [])

  async function loadColetas() {
    const { data } = await supabase
      .from('coletas').select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)
    setColetas(data || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      data: form.data,
      turno: form.turno,
      pequeno: Number(form.pequeno) || 0,
      grande: Number(form.grande) || 0,
      extra_grande: Number(form.extra_grande) || 0,
      jumbo: Number(form.jumbo) || 0,
      trincados: Number(form.trincados) || 0,
      perdas: Number(form.perdas) || 0,
      observacoes: form.observacoes || null,
      user_id: user.id,
    }
    await supabase.from('coletas').insert(payload)
    setForm({ data: today, turno: 'manha', pequeno: '', grande: '', extra_grande: '', jumbo: '', trincados: '', perdas: '', observacoes: '' })
    setShowForm(false)
    setSaving(false)
    loadColetas()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta coleta?')) return
    await supabase.from('coletas').delete().eq('id', id)
    loadColetas()
  }

  const totalHoje = coletas
    .filter(c => c.data === today)
    .reduce((s, c) => s + totalOvos(c), 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Coleta de Ovos</h1>
          <p className="text-sm text-gray-500">Total hoje: <span className="font-semibold text-brand-orange">{totalHoje} ovos</span></p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow"
        >
          <Plus size={18} />
          Nova Coleta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Registrar Coleta</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Turno</label>
              <select value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">Ovos por classificação</p>
            <div className="grid grid-cols-2 gap-3">
              {CLASSIFICACOES.map(k => (
                <div key={k}>
                  <label className="text-xs text-gray-400">{LABELS[k]}</label>
                  <input type="number" min="0" value={form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Trincados</label>
              <input type="number" min="0" value={form.trincados}
                onChange={e => setForm(f => ({ ...f, trincados: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Perdas</label>
              <input type="number" min="0" value={form.perdas}
                onChange={e => setForm(f => ({ ...f, perdas: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Opcional..."
              rows={2}
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

      {/* Lista de coletas */}
      <div className="space-y-3">
        {coletas.map(c => (
          <div key={c.id} className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-brand-navy text-sm">
                  {new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR')} — {TURNOS.find(t => t.value === c.turno)?.label}
                </p>
                <p className="text-brand-orange font-bold text-lg">{totalOvos(c)} ovos</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(c.id)} className="text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {CLASSIFICACOES.map(k => (
                <div key={k} className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-xs text-gray-400">{LABELS[k]}</p>
                  <p className="font-semibold text-gray-800">{c[k]}</p>
                </div>
              ))}
            </div>
            {(c.trincados > 0 || c.perdas > 0) && (
              <div className="flex gap-3 mt-2">
                {c.trincados > 0 && <span className="text-xs text-orange-500">Trincados: {c.trincados}</span>}
                {c.perdas > 0 && <span className="text-xs text-red-500">Perdas: {c.perdas}</span>}
              </div>
            )}
            {c.observacoes && <p className="text-xs text-gray-400 mt-1">{c.observacoes}</p>}
          </div>
        ))}
        {coletas.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Egg size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma coleta registrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
