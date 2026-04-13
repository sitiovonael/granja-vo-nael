import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Egg, TrendingUp, ShoppingCart, AlertTriangle, Truck, Skull } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

function StatCard({ icon: Icon, label, value, sub, color = 'orange' }) {
  const colors = {
    orange: 'bg-brand-orange text-white',
    navy: 'bg-brand-navy text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
  }
  return (
    <div className={`rounded-2xl p-4 shadow ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-90">{label}</span>
        <Icon size={20} className="opacity-80" />
      </div>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [stats, setStats] = useState({})
  const [weekData, setWeekData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingEntregas, setPendingEntregas] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [coletaHoje, coletaMes, vendasMes, mortalidadeMes, entregas] = await Promise.all([
      supabase.from('coletas').select('pequeno,grande,extra_grande,jumbo,trincados,perdas').eq('data', today),
      supabase.from('coletas').select('pequeno,grande,extra_grande,jumbo').gte('data', `${thisMonth}-01`),
      supabase.from('vendas').select('pequeno,grande,extra_grande,jumbo,tipo_pequeno,tipo_grande,tipo_extra_grande,tipo_jumbo,preco_pequeno,preco_grande,preco_extra_grande,preco_jumbo,frete').gte('data', `${thisMonth}-01`),
      supabase.from('mortalidade').select('quantidade').gte('data', `${thisMonth}-01`),
      supabase.from('entregas').select('id').eq('status', 'pendente'),
    ])

    const MULT = { unidade: 1, cartela12: 12, cartela30: 30 }
    const CLASSIFS = ['pequeno', 'grande', 'extra_grande', 'jumbo']

    const somaOvos = (rows) => rows?.reduce((s, r) => s + r.pequeno + r.grande + r.extra_grande + r.jumbo, 0) ?? 0
    const ovosHoje = somaOvos(coletaHoje.data)
    const ovosMes = somaOvos(coletaMes.data)

    const totalVendas = vendasMes.data?.reduce((s, v) => {
      const sub = CLASSIFS.reduce((acc, k) => {
        const mult = MULT[v[`tipo_${k}`]] || 1
        const cartelas = mult > 0 ? Math.round((v[k] || 0) / mult) : (v[k] || 0)
        return acc + cartelas * (Number(v[`preco_${k}`]) || 0)
      }, 0)
      return s + sub + Number(v.frete || 0)
    }, 0) ?? 0
    const mortMes = mortalidadeMes.data?.reduce((s, r) => s + r.quantidade, 0) ?? 0

    setStats({ ovosHoje, ovosMes, totalVendas, mortMes })
    setPendingEntregas(entregas.data?.length ?? 0)

    // últimos 7 dias
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().split('T')[0])
    }
    const { data: semana } = await supabase
      .from('coletas').select('data,pequeno,grande,extra_grande,jumbo')
      .in('data', days)

    const grouped = days.map(d => {
      const rows = semana?.filter(r => r.data === d) ?? []
      return {
        dia: d.slice(5).replace('-', '/'),
        ovos: somaOvos(rows)
      }
    })
    setWeekData(grouped)
    setLoading(false)
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>

  const mediaStr = stats.ovosHoje >= 350 ? '✓ Acima da média' : stats.ovosHoje > 0 ? '↓ Abaixo da média (350)' : 'Nenhuma coleta hoje'

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-brand-navy text-xl font-bold">Bom dia!</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Egg} label="Ovos hoje" value={stats.ovosHoje} sub={mediaStr} color="orange" />
        <StatCard icon={Egg} label="Ovos este mês" value={stats.ovosMes} color="navy" />
        {isAdmin && (
          <StatCard icon={ShoppingCart} label="Vendas este mês" value={`R$ ${stats.totalVendas.toFixed(2)}`} color="green" />
        )}
        <StatCard icon={Skull} label="Mortes este mês" value={stats.mortMes} color="red" />
        <StatCard icon={Truck} label="Entregas pendentes" value={pendingEntregas} color="navy" />
      </div>

      {/* Gráfico da semana */}
      <div className="bg-white rounded-2xl p-4 shadow">
        <h2 className="text-sm font-semibold text-brand-navy mb-3">Produção — últimos 7 dias</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekData} barSize={28}>
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={35} />
            <Tooltip />
            <Bar dataKey="ovos" fill="#F5A624" radius={[6, 6, 0, 0]} name="Ovos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alerta de mortalidade */}
      {stats.mortMes > 5 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-700 font-semibold text-sm">Atenção: Mortalidade alta</p>
            <p className="text-red-600 text-xs mt-0.5">{stats.mortMes} mortes este mês. Verifique a saúde do plantel.</p>
          </div>
        </div>
      )}
    </div>
  )
}
