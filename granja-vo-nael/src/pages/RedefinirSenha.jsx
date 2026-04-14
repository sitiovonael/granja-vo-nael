import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const [pronto, setPronto] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    // Supabase processa o token do hash automaticamente e dispara o evento
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPronto(true)
      }
    })

    // Caso o evento já tenha sido disparado antes do componente montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronto(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (novaSenha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirma) {
      setErro('As senhas não coincidem.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setLoading(false)
    if (error) {
      setErro('Erro ao atualizar senha. O link pode ter expirado, solicite um novo.')
    } else {
      setSucesso(true)
      setTimeout(() => navigate('/'), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="w-28 h-28 rounded-full bg-brand-orange flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-5xl">🐔</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-wide">Granja Vô Nael</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        {sucesso ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">✅</div>
            <p className="text-brand-navy font-bold text-lg">Senha atualizada!</p>
            <p className="text-gray-500 text-sm">Você será redirecionado automaticamente...</p>
          </div>
        ) : !pronto ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">Verificando link...</p>
          </div>
        ) : (
          <>
            <h2 className="text-brand-navy text-lg font-semibold mb-1 text-center">Nova senha</h2>
            <p className="text-gray-400 text-xs text-center mb-5">Digite e confirme sua nova senha de acesso</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                  <button type="button" onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-3.5 text-gray-400">
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Confirmar senha</label>
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={confirma}
                  onChange={e => setConfirma(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

              <button type="submit" disabled={loading}
                className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-60 transition">
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
