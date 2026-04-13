import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Wheat, DollarSign, Calculator, Save, TrendingUp } from 'lucide-react'

const CATEGORIAS_CUSTO = [
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'energia', label: 'Energia' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'outro', label: 'Outro' },
]

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)
const GRAMAS_POR_DIA = 110

export default function Racao() {
  const { user } = useAuth()
  const [racoes, setRacoes] = useState([])
  const [custos, setCustos] = useState([])
  const [config, setConfig] = useState({ num_galinhas: 500, custo_fixo_mensal: 0, telefone_pai: '' })
  const [tab, setTab] = useState('calculadora')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [formRacao, setFormRacao] = useState({ data: today, tipo: '', quantidade_kg: '', custo_total: '', fornecedor: '', observacoes: '' })
  const [formCusto, setFormCusto] = useState({ data: today, descricao: '', categoria: 'outro', valor: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [r, c, cfg] = await Promise.all([
      supabase.from('racao').select('*').order('data', { ascending: false }).limit(30),
      supabase.from('custos').select('*').order('data', { ascending: false }).limit(30),
      supabase.from('configuracoes').select('*').eq('id', 1).single(),
    ])
    setRacoes(r.data || [])
    setCustos(c.data || [])
    if (cfg.data) setConfig(cfg.data)
  }

  async function saveConfig() {
    setSavingConfig(true)
    await supabase.from('configuracoes').update({
      num_galinhas: Number(config.num_galinhas),
      custo_fixo_mensal: Number(config.custo_fixo_mensal),
      telefone_pai: config.telefone_pai,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    setSavingConfig(false)
    alert('Configurações salvas!')
  }

  async function handleSaveRacao(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('racao').insert({
      data: formRacao.data, tipo: formRacao.tipo,
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
      data: formCusto.data, descricao: formCusto.descricao,
      categoria: formCusto.categoria, valor: Number(formCusto.valor),
      user_id: user.id,
    })
    setFormCusto({ data: today, descricao: '', categoria: 'outro', valor: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  // Calculadora de ração
  const numGalinhas = Number(config.num_galinhas) || 0
  const consumoDiarioKg = (numGalinhas * GRAMAS_POR_DIA) / 1000
  const consumoSemanalKg = consumoDiarioKg * 7
  const consumoMensalKg = consumoDiarioKg * 30

  // Custo por kg médio (últimas compras)
  const totalKgComprado = racoes.reduce((s, r) => s + Number(r.quantidade_kg || 0), 0)
  const totalCustoRacao = racoes.reduce((s, r) => s + Number(r.custo_total || 0), 0)
  const custoPorKg = totalKgComprado > 0 ? totalCustoRacao / totalKgComprado : 0
  const custoRacaoDiario = consumoDiarioKg * custoPorKg

  // Estoque de ração estimado
  const racaoMes = racoes.filter(r => r.data?.startsWith(thisMonth))
  const totalRacaoMes = racaoMes.reduce((s, r) => s + Number(r.custo_total || 0), 0)
  const totalCustosMes = custos.filter(c => c.data?.startsWith(thisMonth)).reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalGeral = totalRacaoMes + totalCustosMes

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-brand-navy text-xl font-bold">Ração & Custos</h1>
          <p className="text-sm text-gray-500">Gasto este mês: <span className="font-semibold text-red-600">R$ {totalGeral.toFixed(2)}</span></p>
        </div>
        {(tab === 'racao' || tab === 'custos') && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-orange text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium shadow">
            <Plus size={18} /> Novo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 rounded-xl p-1 gap-1 overflow-x-auto">
        {[
          { key: 'calculadora', label: 'Calculadora' },
          { key: 'precificacao', label: 'Precificação' },
          { key: 'racao', label: 'Ração' },
          { key: 'custos', label: 'Custos' },
          { key: 'config', label: 'Config.' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${tab === t.key ? 'bg-white text-brand-navy shadow' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CALCULADORA */}
      {tab === 'calculadora' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={18} className="text-brand-orange" />
              <h2 className="font-semibold text-brand-navy">Necessidade de Ração</h2>
            </div>
            <p className="text-xs text-gray-400 mb-3">Baseado em {numGalinhas} galinhas × {GRAMAS_POR_DIA}g/dia</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">Por dia</p>
                <p className="text-xl font-bold text-amber-700">{consumoDiarioKg.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">Por semana</p>
                <p className="text-xl font-bold text-amber-700">{consumoSemanalKg.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
              </div>
              <div className="bg-amber-100 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-700 font-medium">Por mês</p>
                <p className="text-xl font-bold text-amber-800">{consumoMensalKg.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
              </div>
            </div>

            {custoPorKg > 0 && (
              <div className="mt-3 bg-brand-navy/5 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Custo estimado (R$ {custoPorKg.toFixed(2)}/kg)</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Dia</p>
                    <p className="font-bold text-brand-navy text-sm">R$ {custoRacaoDiario.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Semana</p>
                    <p className="font-bold text-brand-navy text-sm">R$ {(custoRacaoDiario * 7).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Mês</p>
                    <p className="font-bold text-brand-navy text-sm">R$ {(custoRacaoDiario * 30).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulador de compra */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold text-brand-navy mb-3">Quanto comprar agora?</h2>
            <SimuladorCompra consumoDiario={consumoDiarioKg} custoPorKg={custoPorKg} />
          </div>
        </div>
      )}

      {/* PRECIFICAÇÃO */}
      {tab === 'precificacao' && (
        <Precificacao
          totalRacaoMes={totalRacaoMes}
          totalCustosMes={totalCustosMes}
          custoFixo={Number(config.custo_fixo_mensal) || 0}
          racoes={racoes}
          custos={custos}
        />
      )}

      {/* RAÇÃO */}
      {tab === 'racao' && (
        <>
          {showForm && (
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
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {racoes.map(r => (
              <div key={r.id} className="bg-white rounded-2xl shadow p-4 flex justify-between">
                <div>
                  <p className="font-semibold text-brand-navy text-sm">{r.tipo}</p>
                  <p className="text-xs text-gray-400">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}{r.fornecedor ? ` · ${r.fornecedor}` : ''}</p>
                  <p className="text-sm text-gray-600 mt-1">{r.quantidade_kg} kg · R$ {(r.custo_total / r.quantidade_kg).toFixed(2)}/kg</p>
                </div>
                <p className="text-amber-600 font-bold">R$ {Number(r.custo_total).toFixed(2)}</p>
              </div>
            ))}
            {racoes.length === 0 && <div className="text-center py-10 text-gray-400"><Wheat size={36} className="mx-auto mb-2 opacity-30" /><p>Nenhum registro</p></div>}
          </div>
        </>
      )}

      {/* CUSTOS */}
      {tab === 'custos' && (
        <>
          {showForm && (
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
                <div>
                  <label className="text-xs text-gray-500 font-medium">Descrição</label>
                  <input value={formCusto.descricao} onChange={e => setFormCusto(f => ({ ...f, descricao: e.target.value }))} required
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
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
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
            {custos.length === 0 && <div className="text-center py-10 text-gray-400"><DollarSign size={36} className="mx-auto mb-2 opacity-30" /><p>Nenhum custo</p></div>}
          </div>
        </>
      )}

      {/* CONFIG */}
      {tab === 'config' && (
        <div className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="font-semibold text-brand-navy">Configurações da Granja</h2>
          <div>
            <label className="text-xs text-gray-500 font-medium">Número de galinhas ativas</label>
            <input type="number" min="0" value={config.num_galinhas}
              onChange={e => setConfig(c => ({ ...c, num_galinhas: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            <p className="text-xs text-gray-400 mt-1">Usado para calcular necessidade de ração</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Custo fixo mensal (R$)</label>
            <input type="number" min="0" step="0.01" value={config.custo_fixo_mensal}
              onChange={e => setConfig(c => ({ ...c, custo_fixo_mensal: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            <p className="text-xs text-gray-400 mt-1">Usado para calcular lucro por ovo nos relatórios</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">WhatsApp do Carlos (com DDD)</label>
            <input type="tel" value={config.telefone_pai || ''}
              onChange={e => setConfig(c => ({ ...c, telefone_pai: e.target.value }))}
              placeholder="Ex: 11999999999"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
            <p className="text-xs text-gray-400 mt-1">Usado para enviar resumo diário de entregas</p>
          </div>
          <button onClick={saveConfig} disabled={savingConfig}
            className="w-full bg-brand-navy text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            <Save size={16} />
            {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  )
}

function Precificacao({ totalRacaoMes, totalCustosMes, custoFixo }) {
  const [producaoMensal, setProducaoMensal] = useState('9000')
  const [margem, setMargem] = useState('30')

  const totalCustos = totalRacaoMes + totalCustosMes + custoFixo
  const producao = Number(producaoMensal) || 1
  const custoPorOvo = totalCustos / producao
  const margemDecimal = (Number(margem) || 0) / 100

  const precoUnidade = custoPorOvo * (1 + margemDecimal)
  const precoCartela12 = precoUnidade * 12
  const precoCartela30 = precoUnidade * 30

  return (
    <div className="space-y-4">
      {/* Resumo de custos */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-brand-orange" />
          <h2 className="font-semibold text-brand-navy">Custos do Mês Atual</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Ração</span>
            <span className="font-medium text-gray-800">R$ {totalRacaoMes.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Outros custos</span>
            <span className="font-medium text-gray-800">R$ {totalCustosMes.toFixed(2)}</span>
          </div>
          {custoFixo > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Custo fixo mensal</span>
              <span className="font-medium text-gray-800">R$ {custoFixo.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-2 mt-1">
            <span className="text-brand-navy">Total de custos</span>
            <span className="text-red-600">R$ {totalCustos.toFixed(2)}</span>
          </div>
        </div>
        {totalCustos === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
            ⚠️ Nenhum custo registrado este mês. Cadastre ração e custos para um cálculo preciso.
          </p>
        )}
      </div>

      {/* Parâmetros */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-4">
        <h2 className="font-semibold text-brand-navy">Parâmetros de Precificação</h2>
        <div>
          <label className="text-xs text-gray-500 font-medium">Produção mensal estimada (ovos)</label>
          <input type="number" min="1" value={producaoMensal}
            onChange={e => setProducaoMensal(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" />
          <p className="text-xs text-gray-400 mt-1">Ex: 500 galinhas × 60% postura × 30 dias ≈ 9.000 ovos</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-2 block">Margem de lucro desejada (%)</label>
          <div className="flex gap-2 mb-2">
            {['10', '20', '30', '40', '50'].map(m => (
              <button key={m} type="button" onClick={() => setMargem(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${margem === m ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
                {m}%
              </button>
            ))}
          </div>
          <input type="number" min="0" max="500" value={margem}
            onChange={e => setMargem(e.target.value)}
            placeholder="Ou digite outro valor"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Resultado */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-brand-navy">Preços Mínimos Sugeridos</h2>
        <div className="bg-brand-navy/5 rounded-xl p-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Custo por ovo</p>
            <p className="font-bold text-brand-navy text-lg">R$ {custoPorOvo.toFixed(4)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Com {margem}% de margem</p>
            <p className="font-bold text-green-600 text-lg">R$ {precoUnidade.toFixed(4)}/ovo</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-green-700 font-semibold mb-1">Unidade</p>
            <p className="text-lg font-bold text-green-800">R$ {precoUnidade.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">por ovo</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-700 font-semibold mb-1">Cartela 12</p>
            <p className="text-lg font-bold text-blue-800">R$ {precoCartela12.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-1">por cartela</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-700 font-semibold mb-1">Cartela 30</p>
            <p className="text-lg font-bold text-purple-800">R$ {precoCartela30.toFixed(2)}</p>
            <p className="text-xs text-purple-600 mt-1">por cartela</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Baseado em R$ {totalCustos.toFixed(2)} de custos ÷ {Number(producaoMensal).toLocaleString('pt-BR')} ovos
        </p>
      </div>
    </div>
  )
}

function SimuladorCompra({ consumoDiario, custoPorKg }) {
  const [dias, setDias] = useState('30')
  const kg = consumoDiario * Number(dias)
  const custo = kg * custoPorKg

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 font-medium">Para quantos dias?</label>
        <div className="flex gap-2 mt-2">
          {['7', '15', '30', '60'].map(d => (
            <button key={d} onClick={() => setDias(d)} type="button"
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${dias === d ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-amber-700 font-semibold">{kg.toFixed(1)} kg</p>
          <p className="text-amber-600 text-xs">para {dias} dias</p>
        </div>
        {custoPorKg > 0 && (
          <div className="text-right">
            <p className="text-amber-700 font-bold">R$ {custo.toFixed(2)}</p>
            <p className="text-amber-600 text-xs">custo estimado</p>
          </div>
        )}
      </div>
    </div>
  )
}
