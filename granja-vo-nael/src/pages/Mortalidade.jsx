import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Skull, AlertTriangle, Camera, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CAUSAS = [
  { value: 'doenca', label: 'Doença', color: '#ef4444' },
  { value: 'predador', label: 'Predador', color: '#f97316' },
  { value: 'acidente', label: 'Acidente', color: '#eab308' },
  { value: 'calor', label: 'Calor', color: '#f59e0b' },
  { value: 'frio', label: 'Frio', color: '#3b82f6' },
  { value: 'desconhecida', label: 'Desconhecida', color: '#6b7280' },
  { value: 'outro', label: 'Outro', color: '#8b5cf6' },
]

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

export default function Mortalidade() {
  const { user } = useAuth()
  const [registros, setRegistros] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [form, setForm] = useState({ data: today, quantidade: '1', causa: 'desconhecida', descricao: '' })

  useEffect(() => { loadRegistros() }, [])

  async function loadRegistros() {
    const { data } = await supabase.from('mortalidade').select('*').order('data', { ascending: false }).limit(50)
    setRegistros(data || [])
  }

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleDelete(id) {
    if (!confirm('Apagar este registro?')) return
    await supabase.from('mortalidade').delete().eq('id', id)
    loadRegistros()
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    let foto_url = null
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop()
      const path = `mortalidade/${Date.now()}.${ext}`
      const { data: upload } = await supabase.storage.from('fotos').upload(path, fotoFile, { upsert: true })
      if (upload) {
        const { data: url } = supabase.storage.from('fotos').getPublicUrl(path)
        foto_url = url.publicUrl
      }
    }

    await supabase.from('mortalidade').insert({
      data: form.data,
      quantidade: Number(form.quantidade) || 1,
      causa: form.causa,
      descricao: form.descricao ? (foto_url ? form.descricao : form.descricao) : null,
      user_id: user.id,
    })

    setForm({ data: today, quantidade: '1', causa: 'desconhecida', descricao: '' })
    setFotoPreview(null)
    setFotoFile(null)
    setShowForm(false)
    setSaving(false)
    loadRegistros()
  }

  const doMes = registros.filter(r => r.data?.startsWith(thisMonth))
  const totalMes = doMes.reduce((s, r) => s + r.quantidade, 0)
  const porCausa = CAUSAS.map(c => ({
    name: c.label,
    value: doMes.filter(r => r.causa === c.value).reduce((s, r) => s + r.quantidade, 0),
    color: c.color,
  })).filter(c => c.value > 0)

  const ultimos7 = new Date(); ultimos7.setDate(ultimos7.getDate() - 7)
  const mortes7d = registros.filter(r => new Date(r.data) >= ultimos7).reduce((s, r) => s + r.quantidade, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Mortalidade</h1>
          <p className="text-sm text-gray-500">Este mês: <span className="font-semibold text-red-600">{totalMes} aves</span></p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
          <Plus size={18} /> Registrar
        </button>
      </div>

      {mortes7d >= 3 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Alerta: Mortalidade Elevada</p>
            <p className="text-red-600 text-xs mt-1">{mortes7d} mortes nos últimos 7 dias.</p>
            <ul className="text-red-600 text-xs mt-1 list-disc list-inside space-y-0.5">
              <li>Verificar bebedouros e comedouros</li>
              <li>Checar temperatura do galpão</li>
              <li>Observar sinais de doença no plantel</li>
              <li>Consultar veterinário se persistir</li>
            </ul>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Registrar Morte</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Quantidade</label>
              <input type="number" min="1" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Causa</label>
            <select value={form.causa} onChange={e => setForm(f => ({ ...f, causa: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
              {CAUSAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Descrição / Sintomas</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2} placeholder="Descreva a situação observada..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 resize-none" />
          </div>

          {/* Foto */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Foto (opcional)</label>
            <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-3 cursor-pointer hover:border-brand-orange transition">
              <Camera size={18} className="text-gray-400" />
              <span className="text-sm text-gray-400">Tirar foto ou escolher arquivo</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
            </label>
            {fotoPreview && (
              <div className="mt-2 relative">
                <img src={fotoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                <button type="button" onClick={() => { setFotoPreview(null); setFotoFile(null) }}
                  className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">Remover</button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {porCausa.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-semibold text-brand-navy mb-3">Causas — este mês</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={porCausa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {porCausa.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-3">
        {registros.map(r => {
          const causa = CAUSAS.find(c => c.value === r.causa)
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: causa?.color + '20' }}>
                <Skull size={16} style={{ color: causa?.color }} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-brand-navy">{r.quantidade} {r.quantidade === 1 ? 'ave' : 'aves'}</p>
                    <p className="text-xs text-gray-400">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-red-300 hover:text-red-500 p-1 -mt-1">
                    <Trash2 size={15} />
                  </button>
                </div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1" style={{ backgroundColor: causa?.color + '20', color: causa?.color }}>{causa?.label}</span>
                {r.descricao && <p className="text-xs text-gray-400 mt-1">{r.descricao}</p>}
              </div>
            </div>
          )
        })}
        {registros.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Skull size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma morte registrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
