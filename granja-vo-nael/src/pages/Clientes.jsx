import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Users, Trash2, Building2, User } from 'lucide-react'

export default function Clientes() {
  const { user, isAdmin } = useAuth()
  const [clientes, setClientes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'pf', telefone: '', endereco: '', observacoes: '' })

  useEffect(() => { loadClientes() }, [])

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('clientes').insert({ ...form })
    setForm({ nome: '', tipo: 'pf', telefone: '', endereco: '', observacoes: '' })
    setShowForm(false)
    setSaving(false)
    loadClientes()
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('clientes').update({ ativo: !ativo }).eq('id', id)
    loadClientes()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    loadClientes()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Clientes</h1>
          <p className="text-sm text-gray-500">{clientes.filter(c => c.ativo).length} ativos</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
            <Plus size={18} /> Novo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Novo Cliente</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required
                placeholder="Nome completo"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                <option value="pf">Pessoa Física</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Telefone</label>
              <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Endereço</label>
              <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                placeholder="Rua, número..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
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
        {clientes.map(c => (
          <div key={c.id} className={`bg-white rounded-2xl shadow p-4 ${!c.ativo ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {c.tipo === 'empresa' ? <Building2 size={18} className="text-brand-navy" /> : <User size={18} className="text-brand-orange" />}
                <div>
                  <p className="font-semibold text-brand-navy text-sm">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.tipo === 'pf' ? 'Pessoa Física' : 'Empresa'}</p>
                  {c.telefone && <p className="text-xs text-gray-500 mt-1">{c.telefone}</p>}
                  {c.endereco && <p className="text-xs text-gray-400">{c.endereco}</p>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => toggleAtivo(c.id, c.ativo)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-400 p-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {clientes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-2 opacity-30" />
            <p>Nenhum cliente cadastrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
