import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart, Area } from 'recharts'
import { Egg, DollarSign, Skull, ShoppingCart, AlertTriangle } from 'lucide-react'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Relatorio() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [dados, setDados] = useState(null)
  const [comparativo, setComparativo] = useState([])
  const [clientesFreq, setClientesFreq] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ custo_fixo_mensal: 0 })
  const [debug, setDebug] = useState(null)

  useEffect(() => { loadDados() }, [mes])

  async function loadDados() {
    setLoading(true)
    const inicio = `${mes}-01`
    // Usa split direto no string do mês para evitar bug de fuso horário (UTC vs local)
    const [mesY, mesM] = mes.split('-').map(Number)
    const fim = `${mes}-${String(new Date(mesY, mesM, 0).getDate()).padStart(2, '0')}`

    const [coletas, vendas, mortalidade, racao, custos, cfg, todasVendas] = await Promise.all([
      supabase.from('coletas').select('*').gte('data', inicio).lte('data', fim),
      supabase.from('vendas').select('*, clientes(nome,tipo)').gte('data', inicio).lte('data', fim),
      supabase.from('mortalidade').select('*').gte('data', inicio).lte('data', fim),
      supabase.from('racao').select('*').gte('data', inicio).lte('data', fim),
      supabase.from('custos').select('*').gte('data', inicio).lte('data', fim),
      supabase.from('configuracoes').select('*').eq('id', 1).single(),
      supabase.from('vendas').select('*, clientes(nome)').order('data', { ascending: false }),
    ])

    if (cfg.data) setConfig(cfg.data)

    // DEBUG — remover depois
    console.log('=== RELATÓRIO DEBUG ===')
    console.log('periodo:', inicio, 'a', fim)
    console.log('vendas.data:', vendas.data)
    console.log('vendas.error:', vendas.error)
    console.log('coletas.data:', coletas.data)
    console.log('coletas.error:', coletas.error)
    setDebug({
      vendasQtd: vendas.data?.length ?? 'ERRO',
      vendasErro: vendas.error?.message ?? null,
      coletasQtd: coletas.data?.length ?? 'ERRO',
      primVenda: vendas.data?.[0] ? JSON.stringify(vendas.data[0]).slice(0, 200) : null,
    })

    const MULT = { unidade: 1, cartela12: 12, cartela30: 30 }
    const CLASSIFS = ['pequeno', 'grande', 'extra_grande', 'jumbo']
    function calcVendaReceita(v) {
      const sub = CLASSIFS.reduce((s, k) => {
        const mult = MULT[v[`tipo_${k}`]] || 1
        const cartelas = mult > 0 ? Math.round((v[k] || 0) / mult) : (v[k] || 0)
        return s + cartelas * (Number(v[`preco_${k}`]) || 0)
      }, 0)
      return sub + Number(v.frete || 0)
    }

    const totalOvos = (coletas.data || []).reduce((s, r) => s + r.pequeno + r.grande + r.extra_grande + r.jumbo, 0)
    const totalPerdas = (coletas.data || []).reduce((s, r) => s + r.trincados + r.perdas, 0)
    const totalReceita = (vendas.data || []).reduce((s, v) => s + calcVendaReceita(v), 0)
    const totalRacao = (racao.data || []).reduce((s, r) => s + Number(r.custo_total || 0), 0)
    const totalCustos = (custos.data || []).reduce((s, c) => s + Number(c.valor || 0), 0)
    const totalMortes = (mortalidade.data || []).reduce((s, r) => s + r.quantidade, 0)
    const custoFixo = Number(cfg.data?.custo_fixo_mensal || 0)
    const totalGastos = totalRacao + totalCustos + custoFixo
    const lucro = totalReceita - totalGastos
    const custoPorOvo = totalOvos > 0 ? totalGastos / totalOvos : 0
    const receitaPorOvo = totalOvos > 0 ? totalReceita / totalOvos : 0
    const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0

    const ovosPorClassificacao = [
      { name: 'Pequeno', value: (vendas.data || []).reduce((s, v) => s + v.pequeno, 0) },
      { name: 'Grande', value: (vendas.data || []).reduce((s, v) => s + v.grande, 0) },
      { name: 'Extra Grande', value: (vendas.data || []).reduce((s, v) => s + v.extra_grande, 0) },
      { name: 'Jumbo', value: (vendas.data || []).reduce((s, v) => s + v.jumbo, 0) },
    ].filter(c => c.value > 0)

    const clienteMap = {}
    ;(vendas.data || []).forEach(v => {
      const nome = v.clientes?.nome ?? 'Sem cliente'
      clienteMap[nome] = (clienteMap[nome] || 0) + calcVendaReceita(v)
    })
    const topClientes = Object.entries(clienteMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, valor]) => ({ nome, valor }))

    const diasMap = {}
    ;(coletas.data || []).forEach(c => {
      const d = c.data
      diasMap[d] = (diasMap[d] || 0) + c.pequeno + c.grande + c.extra_grande + c.jumbo
    })
    const producaoDiaria = Object.entries(diasMap).sort((a, b) => a[0].localeCompare(b[0])).map(([data, ovos]) => ({ data: data.slice(8), ovos }))

    setDados({ totalOvos, totalPerdas, totalReceita, totalGastos, lucro, custoPorOvo, receitaPorOvo, margemLucro, totalMortes, ovosPorClassificacao, topClientes, producaoDiaria, totalVendas: vendas.data?.length ?? 0 })

    // Comparativo 6 meses
    const comp = []
    for (let i = 5; i >= 0; i--) {
      // Calcular ano/mês sem depender de Date parsing (evita bug de fuso horário)
      let y = mesY
      let mNum = mesM - i
      while (mNum <= 0) { mNum += 12; y-- }
      while (mNum > 12) { mNum -= 12; y++ }
      const m = String(mNum).padStart(2, '0')
      const ini = `${y}-${m}-01`
      const fim2 = `${y}-${m}-${String(new Date(y, mNum, 0).getDate()).padStart(2, '0')}`
      const [cv, cc, cr, ccu] = await Promise.all([
        supabase.from('vendas').select('*').gte('data', ini).lte('data', fim2),
        supabase.from('coletas').select('pequeno,grande,extra_grande,jumbo').gte('data', ini).lte('data', fim2),
        supabase.from('racao').select('custo_total').gte('data', ini).lte('data', fim2),
        supabase.from('custos').select('valor').gte('data', ini).lte('data', fim2),
      ])
      const receita = (cv.data || []).reduce((s, v) => s + calcVendaReceita(v), 0)
      const ovos = (cc.data || []).reduce((s, r) => s + r.pequeno + r.grande + r.extra_grande + r.jumbo, 0)
      const gastos = (cr.data || []).reduce((s, r) => s + Number(r.custo_total || 0), 0) + (ccu.data || []).reduce((s, c) => s + Number(c.valor || 0), 0) + custoFixo
      comp.push({ mes: `${MESES[mNum - 1]}/${String(y).slice(2)}`, receita, gastos, lucro: receita - gastos, ovos })
    }
    setComparativo(comp)

    // Frequência de clientes (últimos 30 dias)
    const limite = new Date(); limite.setDate(limite.getDate() - 30)
    const limiteStr = limite.toISOString().split('T')[0]
    const clienteUltimaCompra = {}
    ;(todasVendas.data || []).forEach(v => {
      const nome = v.clientes?.nome ?? 'Sem cliente'
      if (!clienteUltimaCompra[nome] || v.data > clienteUltimaCompra[nome].data)
        clienteUltimaCompra[nome] = { data: v.data }
    })
    const sumidos = Object.entries(clienteUltimaCompra)
      .filter(([, v]) => v.data < limiteStr && v.data)
      .sort((a, b) => a[1].data.localeCompare(b[1].data))
      .map(([nome, v]) => {
        const dias = Math.floor((new Date() - new Date(v.data)) / (1000 * 60 * 60 * 24))
        return { nome, data: v.data, dias }
      })
    setClientesFreq(sumidos)
    setLoading(false)
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando relatório...</div>
  if (!dados) return null

  const CORES = ['#F5A624', '#1E2B5E', '#22c55e', '#8b5cf6']

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-brand-navy text-xl font-bold">Relatório</h1>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          className="mt-2 border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" />
      </div>

      {/* DEBUG TEMPORÁRIO */}
      {debug && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3 text-xs space-y-1">
          <p className="font-bold text-yellow-800">🔍 Debug (temporário)</p>
          <p>Vendas carregadas: <strong>{debug.vendasQtd}</strong></p>
          {debug.vendasErro && <p className="text-red-600">Erro vendas: {debug.vendasErro}</p>}
          <p>Coletas carregadas: <strong>{debug.coletasQtd}</strong></p>
          {debug.primVenda && <p className="break-all text-gray-500">1ª venda: {debug.primVenda}</p>}
        </div>
      )}

      {/* Resultado */}
      <div className="bg-brand-orange text-white rounded-2xl p-4 col-span-2">
        <p className="text-sm opacity-90">Resultado do mês</p>
        <p className={`text-3xl font-bold ${dados.lucro >= 0 ? '' : 'text-red-200'}`}>
          {dados.lucro >= 0 ? '+' : ''}R$ {dados.lucro.toFixed(2)}
        </p>
        <p className="text-xs opacity-75 mt-1">Margem: {dados.margemLucro.toFixed(1)}%</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow p-3 text-center"><Egg size={18} className="text-brand-orange mx-auto mb-1" /><p className="text-xs text-gray-500">Ovos coletados</p><p className="font-bold text-brand-navy text-lg">{dados.totalOvos}</p></div>
        <div className="bg-white rounded-2xl shadow p-3 text-center"><ShoppingCart size={18} className="text-green-500 mx-auto mb-1" /><p className="text-xs text-gray-500">Receita</p><p className="font-bold text-green-600 text-lg">R$ {dados.totalReceita.toFixed(2)}</p></div>
        <div className="bg-white rounded-2xl shadow p-3 text-center"><DollarSign size={18} className="text-red-500 mx-auto mb-1" /><p className="text-xs text-gray-500">Gastos</p><p className="font-bold text-red-600 text-lg">R$ {dados.totalGastos.toFixed(2)}</p></div>
        <div className="bg-white rounded-2xl shadow p-3 text-center"><Skull size={18} className="text-gray-500 mx-auto mb-1" /><p className="text-xs text-gray-500">Mortes</p><p className="font-bold text-gray-700 text-lg">{dados.totalMortes}</p></div>
      </div>

      {/* Custo por ovo */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold text-brand-navy text-sm mb-3">Análise por ovo</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-red-50 rounded-xl p-3"><p className="text-xs text-red-500 font-medium">Custo/ovo</p><p className="font-bold text-red-700">R$ {dados.custoPorOvo.toFixed(3)}</p></div>
          <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-green-500 font-medium">Receita/ovo</p><p className="font-bold text-green-700">R$ {dados.receitaPorOvo.toFixed(3)}</p></div>
          <div className={`rounded-xl p-3 ${dados.receitaPorOvo - dados.custoPorOvo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className={`text-xs font-medium ${dados.receitaPorOvo - dados.custoPorOvo >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>Lucro/ovo</p>
            <p className={`font-bold ${dados.receitaPorOvo - dados.custoPorOvo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>R$ {(dados.receitaPorOvo - dados.custoPorOvo).toFixed(3)}</p>
          </div>
        </div>
      </div>

      {/* Comparativo 6 meses */}
      {comparativo.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-brand-navy text-sm mb-3">Comparativo — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={comparativo}>
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
              <Legend iconSize={10} />
              <Bar dataKey="receita" fill="#22c55e" name="Receita" radius={[4,4,0,0]} barSize={16} />
              <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4,4,0,0]} barSize={16} />
              <Line type="monotone" dataKey="lucro" stroke="#F5A624" strokeWidth={2} dot={false} name="Lucro" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Produção diária */}
      {dados.producaoDiaria.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-brand-navy text-sm mb-3">Produção diária</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dados.producaoDiaria} barSize={8}>
              <XAxis dataKey="data" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip />
              <Bar dataKey="ovos" fill="#F5A624" radius={[3,3,0,0]} name="Ovos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Vendas por classificação */}
      {dados.ovosPorClassificacao.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-brand-navy text-sm mb-3">Vendas por classificação</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={dados.ovosPorClassificacao} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                {dados.ovosPorClassificacao.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip /><Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top clientes */}
      {dados.topClientes.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-brand-navy text-sm mb-3">Top clientes</h2>
          <div className="space-y-2">
            {dados.topClientes.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm"><span className="font-medium text-gray-700">{c.nome}</span><span className="text-green-600 font-semibold">R$ {c.valor.toFixed(2)}</span></div>
                  <div className="bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="bg-brand-orange h-1.5 rounded-full" style={{ width: `${(c.valor / dados.topClientes[0].valor) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clientes sumidos */}
      {clientesFreq.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-brand-navy text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            Clientes sem comprar há +30 dias
          </h2>
          <div className="space-y-2">
            {clientesFreq.map(c => (
              <div key={c.nome} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <p className="text-sm font-medium text-gray-700">{c.nome}</p>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-xl font-medium">
                  {c.dias} dias
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análise textual */}
      <div className="bg-brand-navy rounded-2xl p-4 text-white space-y-2">
        <h2 className="font-semibold">Análise do mês</h2>
        <div className="text-sm space-y-1.5 text-gray-300">
          {dados.lucro > 0
            ? <p>✅ Mês lucrativo com <span className="text-white font-medium">R$ {dados.lucro.toFixed(2)}</span> de lucro.</p>
            : <p>⚠️ Mês com prejuízo de <span className="text-red-300 font-medium">R$ {Math.abs(dados.lucro).toFixed(2)}</span>.</p>}
          {dados.totalPerdas > 0 && <p>🥚 {((dados.totalPerdas / (dados.totalOvos + dados.totalPerdas)) * 100).toFixed(1)}% de perda na coleta ({dados.totalPerdas} ovos).</p>}
          {dados.totalMortes > 0 && <p>💀 {dados.totalMortes} {dados.totalMortes === 1 ? 'morte registrada' : 'mortes registradas'} no plantel.</p>}
          {dados.custoPorOvo > 0 && dados.receitaPorOvo > 0 && <p>📊 Lucro de <span className="text-white font-medium">R$ {(dados.receitaPorOvo - dados.custoPorOvo).toFixed(3)}</span> por ovo.</p>}
          {dados.totalVendas > 0 && <p>🛒 {dados.totalVendas} {dados.totalVendas === 1 ? 'venda realizada' : 'vendas realizadas'}.</p>}
          {clientesFreq.length > 0 && <p>👥 {clientesFreq.length} cliente(s) sem comprar há mais de 30 dias.</p>}
        </div>
      </div>
    </div>
  )
}
