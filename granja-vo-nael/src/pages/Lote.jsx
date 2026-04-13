import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Bird, TrendingDown, TrendingUp, Minus, Syringe, Bug } from 'lucide-react'

const today = new Date().toISOString().split('T')[0]

function calcularFase(dataNascimento, dataEntrada) {
  const ref = dataNascimento || dataEntrada
  if (!ref) return null
  const meses = (new Date() - new Date(ref)) / (1000 * 60 * 60 * 24 * 30.44)
  if (meses < 6) return { fase: 'crescimento', label: 'Crescimento', cor: 'bg-blue-100 text-blue-700', icon: TrendingUp, desc: 'Ainda não está botando. Início previsto em breve.' }
  if (meses < 18) return { fase: 'pico', label: 'Pico de Produção', cor: 'bg-green-100 text-green-700', icon: TrendingUp, desc: 'Fase de maior produção. Aproveite!' }
  if (meses < 36) return { fase: 'estavel', label: 'Produção Estável', cor: 'bg-yellow-100 text-yellow-700', icon: Minus, desc: 'Produção ~20% abaixo do pico. Ainda rentável.' }
  if (meses < 48) return { fase: 'declinio', label: 'Declínio', cor: 'bg-orange-100 text-orange-700', icon: TrendingDown, desc: 'Produção caindo. Considere planejar renovação.' }
  return { fase: 'descarte', label: 'Renovação necessária', cor: 'bg-red-100 text-red-700', icon: TrendingDown, desc: 'Produção muito baixa. Recomenda-se substituir o lote.' }
}

function idadeTexto(dataNascimento, dataEntrada) {
  const ref = dataNascimento || dataEntrada
  if (!ref) return '—'
  const meses = Math.floor((new Date() - new Date(ref)) / (1000 * 60 * 60 * 24 * 30.44))
  if (meses < 1) return 'Menos de 1 mês'
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12); const m = meses % 12
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}${m > 0 ? ` e ${m} meses` : ''}`
}

function previsaoDescarte(dataNascimento, dataEntrada) {
  const ref = dataNascimento || dataEntrada
  if (!ref) return null
  const d = new Date(ref); d.setMonth(d.getMonth() + 48)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function Lote() {
  const { user } = useAuth()
  const [lotes, setLotes] = useState([])
  const [vacinacoes, setVacinacoes] = useState([])
  const [doencas, setDoencas] = useState([])
  const [tab, setTab] = useState('lotes')
  const [loteAtivo, setLoteAtivo] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formLote, setFormLote] = useState({ nome: '', data_nascimento: '', data_entrada: today, quantidade: '', raca: '', observacoes: '' })
  const [formVacina, setFormVacina] = useState({ lote_id: '', nome_vacina: '', data_aplicacao: today, proxima_dose: '', observacoes: '' })
  const [formDoenca, setFormDoenca] = useState({ lote_id: '', data: today, descricao: '', sintomas: '', tratamento: '', resolvida: false })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [l, v, d] = await Promise.all([
      supabase.from('lotes').select('*').order('data_entrada', { ascending: false }),
      supabase.from('vacinacoes').select('*, lotes(nome)').order('data_aplicacao', { ascending: false }),
      supabase.from('doencas').select('*, lotes(nome)').order('data', { ascending: false }),
    ])
    setLotes(l.data || [])
    setVacinacoes(v.data || [])
    setDoencas(d.data || [])
  }

  async function saveLote(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('lotes').insert({ ...formLote, quantidade: Number(formLote.quantidade), data_nascimento: formLote.data_nascimento || null, user_id: user.id })
    setFormLote({ nome: '', data_nascimento: '', data_entrada: today, quantidade: '', raca: '', observacoes: '' })
    setShowForm(false); setSaving(false); loadAll()
  }

  async function saveVacina(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('vacinacoes').insert({ ...formVacina, proxima_dose: formVacina.proxima_dose || null, user_id: user.id })
    setFormVacina({ lote_id: loteAtivo || '', nome_vacina: '', data_aplicacao: today, proxima_dose: '', observacoes: '' })
    setShowForm(false); setSaving(false); loadAll()
  }

  async function saveDoenca(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('doencas').insert({ ...formDoenca, user_id: user.id })
    setFormDoenca({ lote_id: loteAtivo || '', data: today, descricao: '', sintomas: '', tratamento: '', resolvida: false })
    setShowForm(false); setSaving(false); loadAll()
  }

  async function resolverDoenca(id) {
    await supabase.from('doencas').update({ resolvida: true }).eq('id', id); loadAll()
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('lotes').update({ ativo: !ativo }).eq('id', id); loadAll()
  }

  // Próximas vacinas
  const proximasVacinas = vacinacoes
    .filter(v => v.proxima_dose && v.proxima_dose >= today)
    .sort((a, b) => a.proxima_dose.localeCompare(b.proxima_dose))
    .slice(0, 3)

  const doencasAbertas = doencas.filter(d => !d.resolvida)
  const totalAtivas = lotes.filter(l => l.ativo).reduce((s, l) => s + l.quantidade, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Lotes</h1>
          <p className="text-sm text-gray-500">{totalAtivas} galinhas ativas</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (tab === 'vacinas') setFormVacina(f => ({ ...f, lote_id: loteAtivo || '' })); if (tab === 'doencas') setFormDoenca(f => ({ ...f, lote_id: loteAtivo || '' })) }}
          className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
          <Plus size={18} /> Novo
        </button>
      </div>

      {/* Alertas */}
      {proximasVacinas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 space-y-1">
          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Syringe size={13} /> Próximas vacinas</p>
          {proximasVacinas.map(v => (
            <p key={v.id} className="text-xs text-blue-600">
              {new Date(v.proxima_dose + 'T12:00:00').toLocaleDateString('pt-BR')} · {v.nome_vacina} ({v.lotes?.nome})
            </p>
          ))}
        </div>
      )}
      {doencasAbertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1"><Bug size={13} /> {doencasAbertas.length} ocorrência(s) em aberto</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-200 rounded-xl p-1">
        {[{ key: 'lotes', label: 'Lotes' }, { key: 'vacinas', label: 'Vacinação' }, { key: 'doencas', label: 'Doenças' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${tab === t.key ? 'bg-white text-brand-navy shadow' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {/* LOTES */}
      {tab === 'lotes' && (
        <>
          {showForm && (
            <form onSubmit={saveLote} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <h2 className="font-semibold text-brand-navy">Novo Lote</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Nome</label><input value={formLote.nome} onChange={e => setFormLote(f => ({ ...f, nome: e.target.value }))} required className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">Quantidade</label><input type="number" value={formLote.quantidade} onChange={e => setFormLote(f => ({ ...f, quantidade: e.target.value }))} required className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">Nascimento</label><input type="date" value={formLote.data_nascimento} onChange={e => setFormLote(f => ({ ...f, data_nascimento: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">Entrada</label><input type="date" value={formLote.data_entrada} onChange={e => setFormLote(f => ({ ...f, data_entrada: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Raça</label><input value={formLote.raca} onChange={e => setFormLote(f => ({ ...f, raca: e.target.value }))} placeholder="Ex: Caipira, ISA Brown..." className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {lotes.map(l => {
              const fase = calcularFase(l.data_nascimento, l.data_entrada)
              const FaseIcon = fase?.icon ?? Bird
              return (
                <div key={l.id} className={`bg-white rounded-2xl shadow p-4 space-y-3 ${!l.ativo ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-brand-navy">{l.nome}</p>
                      <p className="text-xs text-gray-500">{l.quantidade} galinhas{l.raca ? ` · ${l.raca}` : ''}</p>
                    </div>
                    <button onClick={() => toggleAtivo(l.id, l.ativo)} className={`text-xs px-2 py-1 rounded-lg font-medium ${l.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{l.ativo ? 'Ativo' : 'Inativo'}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Idade</p><p className="font-semibold text-gray-700">{idadeTexto(l.data_nascimento, l.data_entrada)}</p></div>
                    <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Renovação prevista</p><p className="font-semibold text-gray-700">{previsaoDescarte(l.data_nascimento, l.data_entrada) ?? '—'}</p></div>
                  </div>
                  {fase && (
                    <div className={`rounded-xl px-3 py-2 flex items-start gap-2 ${fase.cor}`}>
                      <FaseIcon size={14} className="mt-0.5 shrink-0" />
                      <div><p className="text-xs font-semibold">{fase.label}</p><p className="text-xs opacity-80">{fase.desc}</p></div>
                    </div>
                  )}
                </div>
              )
            })}
            {lotes.length === 0 && <div className="text-center py-12 text-gray-400"><Bird size={40} className="mx-auto mb-2 opacity-30" /><p>Nenhum lote</p></div>}
          </div>
        </>
      )}

      {/* VACINAÇÃO */}
      {tab === 'vacinas' && (
        <>
          {showForm && (
            <form onSubmit={saveVacina} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <h2 className="font-semibold text-brand-navy">Registrar Vacina</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Lote</label>
                  <select value={formVacina.lote_id} onChange={e => setFormVacina(f => ({ ...f, lote_id: e.target.value }))} required className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                    <option value="">Selecione...</option>
                    {lotes.filter(l => l.ativo).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Nome da vacina</label><input value={formVacina.nome_vacina} onChange={e => setFormVacina(f => ({ ...f, nome_vacina: e.target.value }))} required placeholder="Ex: Newcastle, Marek..." className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">Data aplicação</label><input type="date" value={formVacina.data_aplicacao} onChange={e => setFormVacina(f => ({ ...f, data_aplicacao: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">Próxima dose</label><input type="date" value={formVacina.proxima_dose} onChange={e => setFormVacina(f => ({ ...f, proxima_dose: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Observações</label><input value={formVacina.observacoes} onChange={e => setFormVacina(f => ({ ...f, observacoes: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {vacinacoes.map(v => (
              <div key={v.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-brand-navy text-sm flex items-center gap-1"><Syringe size={14} className="text-blue-400" />{v.nome_vacina}</p>
                    <p className="text-xs text-gray-400">{v.lotes?.nome} · {new Date(v.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  {v.proxima_dose && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Próxima dose</p>
                      <p className={`text-xs font-semibold ${v.proxima_dose <= today ? 'text-red-600' : 'text-blue-600'}`}>{new Date(v.proxima_dose + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                </div>
                {v.observacoes && <p className="text-xs text-gray-400 mt-1">{v.observacoes}</p>}
              </div>
            ))}
            {vacinacoes.length === 0 && <div className="text-center py-12 text-gray-400"><Syringe size={40} className="mx-auto mb-2 opacity-30" /><p>Nenhuma vacina registrada</p></div>}
          </div>
        </>
      )}

      {/* DOENÇAS */}
      {tab === 'doencas' && (
        <>
          {showForm && (
            <form onSubmit={saveDoenca} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <h2 className="font-semibold text-brand-navy">Registrar Ocorrência</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Lote</label>
                  <select value={formDoenca.lote_id} onChange={e => setFormDoenca(f => ({ ...f, lote_id: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                    <option value="">Selecione...</option>
                    {lotes.filter(l => l.ativo).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-gray-500">Data</label><input type="date" value={formDoenca.data} onChange={e => setFormDoenca(f => ({ ...f, data: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Descrição</label><input value={formDoenca.descricao} onChange={e => setFormDoenca(f => ({ ...f, descricao: e.target.value }))} required placeholder="O que foi observado?" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Sintomas</label><textarea value={formDoenca.sintomas} onChange={e => setFormDoenca(f => ({ ...f, sintomas: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 resize-none" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Tratamento</label><textarea value={formDoenca.tratamento} onChange={e => setFormDoenca(f => ({ ...f, tratamento: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1 resize-none" /></div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {doencas.map(d => (
              <div key={d.id} className={`bg-white rounded-2xl shadow p-4 space-y-2 ${d.resolvida ? 'opacity-60' : 'border-l-4 border-red-400'}`}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold text-brand-navy text-sm flex items-center gap-1"><Bug size={14} className="text-red-400" />{d.descricao}</p>
                    <p className="text-xs text-gray-400">{d.lotes?.nome} · {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-xl font-medium h-fit ${d.resolvida ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.resolvida ? 'Resolvida' : 'Em aberto'}</span>
                </div>
                {d.sintomas && <p className="text-xs text-gray-500"><span className="font-medium">Sintomas:</span> {d.sintomas}</p>}
                {d.tratamento && <p className="text-xs text-gray-500"><span className="font-medium">Tratamento:</span> {d.tratamento}</p>}
                {!d.resolvida && (
                  <button onClick={() => resolverDoenca(d.id)} className="w-full bg-green-500 text-white py-2 rounded-xl text-xs font-medium">Marcar como resolvida</button>
                )}
              </div>
            ))}
            {doencas.length === 0 && <div className="text-center py-12 text-gray-400"><Bug size={40} className="mx-auto mb-2 opacity-30" /><p>Nenhuma ocorrência registrada</p></div>}
          </div>
        </>
      )}
    </div>
  )
}
