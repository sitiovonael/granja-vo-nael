import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, CheckCircle2, Circle, Package, Trash2, ClipboardList } from 'lucide-react'

const CLASSIFICACOES = ['pequeno', 'grande', 'extra_grande', 'jumbo']
const LABELS = { pequeno: 'Pequeno', grande: 'Grande', extra_grande: 'Extra Grande', jumbo: 'Jumbo' }
const TIPOS = [
  { value: 'unidade', label: 'Unidade', mult: 1 },
  { value: 'cartela12', label: 'Cartela 12', mult: 12 },
  { value: 'cartela30', label: 'Cartela 30', mult: 30 },
]
const MULT = { unidade: 1, cartela12: 12, cartela30: 30 }

const today = new Date().toISOString().split('T')[0]
function dataFim() {
  const d = new Date(); d.setDate(d.getDate() + 10)
  return d.toISOString().split('T')[0]
}

export default function Preparacao() {
  const { user } = useAuth()
  const [entregas, setEntregas] = useState([])
  const [manuais, setManuais] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    data_prevista: today,
    cliente_nome: '',
    classificacao: 'pequeno',
    tipo: 'cartela12',
    quantidade: '',
    observacoes: '',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [e, m] = await Promise.all([
      supabase.from('entregas')
        .select('*, vendas(pequeno, grande, extra_grande, jumbo, tipo_pequeno, tipo_grande, tipo_extra_grande, tipo_jumbo, clientes(nome))')
        .gte('data_prevista', today)
        .lte('data_prevista', dataFim())
        .neq('status', 'cancelada')
        .neq('status', 'entregue')
        .order('data_prevista')
        .order('hora_prevista'),
      supabase.from('preparacao')
        .select('*')
        .gte('data_prevista', today)
        .lte('data_prevista', dataFim())
        .order('data_prevista'),
    ])
    setEntregas(e.data || [])
    setManuais(m.data || [])
  }

  async function toggleEntrega(id, atual) {
    await supabase.from('entregas').update({ preparado: !atual }).eq('id', id)
    loadAll()
  }

  async function toggleManual(id, atual) {
    await supabase.from('preparacao').update({ preparado: !atual }).eq('id', id)
    loadAll()
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('preparacao').insert({
      ...form,
      quantidade: Number(form.quantidade),
      user_id: user.id,
    })
    setForm({ data_prevista: today, cliente_nome: '', classificacao: 'pequeno', tipo: 'cartela12', quantidade: '', observacoes: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function deleteManual(id) {
    if (!confirm('Remover este item?')) return
    await supabase.from('preparacao').delete().eq('id', id)
    loadAll()
  }

  // Datas únicas dos próximos 10 dias com items
  const allDates = [...new Set([
    ...entregas.map(e => e.data_prevista),
    ...manuais.map(m => m.data_prevista),
  ])].sort()

  // Resumo do que falta preparar (itens não marcados)
  const resumo = {}
  entregas.filter(e => !e.preparado).forEach(e => {
    CLASSIFICACOES.forEach(k => {
      const qtdOvos = e.vendas?.[k] || 0
      if (qtdOvos === 0) return
      const tipo = e.vendas?.[`tipo_${k}`] || 'unidade'
      const mult = MULT[tipo] || 1
      const cartelas = Math.round(qtdOvos / mult)
      const chave = `${k}__${tipo}`
      if (!resumo[chave]) resumo[chave] = { classificacao: k, tipo, total: 0 }
      resumo[chave].total += cartelas
    })
  })
  manuais.filter(m => !m.preparado).forEach(m => {
    const chave = `${m.classificacao}__${m.tipo}`
    if (!resumo[chave]) resumo[chave] = { classificacao: m.classificacao, tipo: m.tipo, total: 0 }
    resumo[chave].total += m.quantidade
  })
  const resumoItens = Object.values(resumo)

  const totalPendente = entregas.filter(e => !e.preparado).length + manuais.filter(m => !m.preparado).length
  const totalFeito = entregas.filter(e => e.preparado).length + manuais.filter(m => m.preparado).length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Preparação</h1>
          <p className="text-sm text-gray-500">
            Próximos 10 dias ·{' '}
            <span className="text-brand-orange font-semibold">{totalPendente} pendente{totalPendente !== 1 ? 's' : ''}</span>
            {totalFeito > 0 && <span className="text-green-600"> · {totalFeito} pronto{totalFeito !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
          <Plus size={18} /> Adicionar
        </button>
      </div>

      {/* Resumo total do que falta */}
      {resumoItens.length > 0 && (
        <div className="bg-brand-navy rounded-2xl p-4 space-y-3">
          <p className="text-brand-orange text-xs font-semibold flex items-center gap-1">
            <Package size={13} /> O QUE FALTA PREPARAR
          </p>
          <div className="grid grid-cols-2 gap-2">
            {resumoItens.map(r => (
              <div key={`${r.classificacao}__${r.tipo}`} className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-white/60 text-xs">{LABELS[r.classificacao]}</p>
                <p className="text-white font-bold text-lg">{r.total}×</p>
                <p className="text-brand-orange text-xs">{TIPOS.find(t => t.value === r.tipo)?.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulário para adicionar item manual */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-4 space-y-3">
          <h2 className="font-semibold text-brand-navy">Adicionar item</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Data</label>
              <input type="date" value={form.data_prevista}
                onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Cliente</label>
              <input value={form.cliente_nome}
                onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
                placeholder="Nome do cliente"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Classificação</label>
              <select value={form.classificacao}
                onChange={e => setForm(f => ({ ...f, classificacao: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                {CLASSIFICACOES.map(k => <option key={k} value={k}>{LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Embalagem</label>
              <select value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Quantidade</label>
              <input type="number" min="1" value={form.quantidade}
                onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                placeholder="Ex: 30"
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Observação</label>
              <input value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Opcional"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista agrupada por data */}
      {allDates.map(date => {
        const entregasDia = entregas.filter(e => e.data_prevista === date)
        const manuaisDia = manuais.filter(m => m.data_prevista === date)
        const labelData = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: '2-digit'
        })
        const isHoje = date === today

        return (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-bold uppercase tracking-wide ${isHoje ? 'text-brand-orange' : 'text-gray-400'}`}>
                {isHoje ? '📅 Hoje — ' : ''}{labelData}
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Entregas do sistema */}
            {entregasDia.map(e => {
              const cliente = e.vendas?.clientes?.nome ?? 'Sem cliente'
              const linhas = CLASSIFICACOES
                .filter(k => (e.vendas?.[k] || 0) > 0)
                .map(k => {
                  const tipo = e.vendas?.[`tipo_${k}`] || 'unidade'
                  const mult = MULT[tipo] || 1
                  const cartelas = Math.round((e.vendas?.[k] || 0) / mult)
                  const tipoLabel = TIPOS.find(t => t.value === tipo)?.label
                  return { k, cartelas, tipoLabel }
                })

              return (
                <div key={e.id}
                  className={`bg-white rounded-2xl shadow p-4 transition ${e.preparado ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleEntrega(e.id, e.preparado)} className="mt-0.5 shrink-0">
                      {e.preparado
                        ? <CheckCircle2 size={24} className="text-green-500" />
                        : <Circle size={24} className="text-gray-300" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-brand-navy text-sm">{cliente}</p>
                        {e.hora_prevista && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{e.hora_prevista}</span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {linhas.map(({ k, cartelas, tipoLabel }) => (
                          <div key={k} className="flex items-center gap-2">
                            <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded-full font-medium">
                              {LABELS[k]}
                            </span>
                            <span className="text-sm font-bold text-gray-800">{cartelas}×</span>
                            <span className="text-xs text-gray-500">{tipoLabel}</span>
                          </div>
                        ))}
                      </div>
                      {e.preparado && (
                        <p className="text-xs text-green-600 font-medium mt-2">✓ Preparado</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Itens manuais */}
            {manuaisDia.map(m => (
              <div key={m.id}
                className={`bg-white rounded-2xl shadow p-4 border-l-4 border-brand-orange transition ${m.preparado ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleManual(m.id, m.preparado)} className="mt-0.5 shrink-0">
                    {m.preparado
                      ? <CheckCircle2 size={24} className="text-green-500" />
                      : <Circle size={24} className="text-gray-300" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-brand-navy text-sm">{m.cliente_nome || 'Sem cliente'}</p>
                      <button onClick={() => deleteManual(m.id)} className="text-red-300 hover:text-red-500 p-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full font-medium">
                        {LABELS[m.classificacao]}
                      </span>
                      <span className="text-sm font-bold text-gray-800">{m.quantidade}×</span>
                      <span className="text-xs text-gray-500">{TIPOS.find(t => t.value === m.tipo)?.label}</span>
                    </div>
                    {m.observacoes && <p className="text-xs text-gray-400 mt-1">{m.observacoes}</p>}
                    {m.preparado && <p className="text-xs text-green-600 font-medium mt-1">✓ Preparado</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {allDates.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={44} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma entrega agendada</p>
          <p className="text-xs mt-1">nos próximos 10 dias</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 bg-brand-orange text-white px-4 py-2 rounded-xl text-sm font-medium">
            Adicionar item manualmente
          </button>
        </div>
      )}
    </div>
  )
}
