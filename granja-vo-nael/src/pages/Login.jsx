import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Tela de esqueci a senha
  const [telaEsqueci, setTelaEsqueci] = useState(false)
  const [emailReset, setEmailReset] = useState('')
  const [resetEnviado, setResetEnviado] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Tela de nova senha (quando veio do link do e-mail)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [senhaAtualizada, setSenhaAtualizada] = useState(false)

  const { signIn, sendPasswordReset, updatePassword, needsPasswordReset } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password, rememberMe)
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetLoading(true)
    const { error } = await sendPasswordReset(emailReset)
    setResetLoading(false)
    if (error) {
      setError('Erro ao enviar e-mail. Verifique o endereço digitado.')
    } else {
      setResetEnviado(true)
      setError('')
    }
  }

  async function handleNovaSenha(e) {
    e.preventDefault()
    if (novaSenha !== confirmaSenha) {
      setError('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await updatePassword(novaSenha)
    setLoading(false)
    if (error) {
      setError('Erro ao atualizar senha. Tente novamente.')
    } else {
      setSenhaAtualizada(true)
      setError('')
    }
  }

  // ── Tela: definir nova senha (veio do link do e-mail) ──
  if (needsPasswordReset) {
    return (
      <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Granja Vô Nael" className="h-20 w-auto mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-white text-xl font-bold">Granja Vô Nael</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
          {senhaAtualizada ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-brand-navy font-semibold">Senha atualizada!</p>
              <p className="text-gray-500 text-sm">Sua senha foi redefinida com sucesso.</p>
              <button onClick={() => navigate('/')} className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl">
                Entrar no app
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-brand-navy text-lg font-semibold mb-1 text-center">Nova senha</h2>
              <p className="text-gray-400 text-xs text-center mb-5">Digite sua nova senha de acesso</p>

              <form onSubmit={handleNovaSenha} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showNovaSenha ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    />
                    <button type="button" onClick={() => setShowNovaSenha(v => !v)} className="absolute right-3 top-3.5 text-gray-400">
                      {showNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Confirmar senha</label>
                  <input
                    type={showNovaSenha ? 'text' : 'password'}
                    value={confirmaSenha}
                    onChange={e => setConfirmaSenha(e.target.value)}
                    required
                    placeholder="Repita a nova senha"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-60">
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Tela: esqueci minha senha ──
  if (telaEsqueci) {
    return (
      <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Granja Vô Nael" className="h-20 w-auto mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-white text-xl font-bold">Granja Vô Nael</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
          {resetEnviado ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <p className="text-brand-navy font-semibold">E-mail enviado!</p>
              <p className="text-gray-500 text-sm">
                Enviamos um link para <strong>{emailReset}</strong>. Clique no link do e-mail para redefinir sua senha.
              </p>
              <p className="text-gray-400 text-xs">Verifique também a caixa de spam.</p>
              <button onClick={() => { setTelaEsqueci(false); setResetEnviado(false); setEmailReset('') }}
                className="w-full bg-brand-navy text-white font-semibold py-3 rounded-xl">
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => { setTelaEsqueci(false); setError('') }}
                className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600">
                <ArrowLeft size={15} /> Voltar
              </button>
              <h2 className="text-brand-navy text-lg font-semibold mb-1">Esqueceu a senha?</h2>
              <p className="text-gray-400 text-xs mb-5">Digite seu e-mail e enviaremos um link para redefinir a senha.</p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type="email"
                      value={emailReset}
                      onChange={e => setEmailReset(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button type="submit" disabled={resetLoading}
                  className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-60">
                  {resetLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Tela: login principal ──
  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Granja Vô Nael" className="h-36 w-auto mx-auto mb-4 drop-shadow-lg" />
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-brand-navy text-lg font-semibold mb-5 text-center">Entrar</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-3.5 text-gray-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Permanecer conectado + Esqueci senha */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div onClick={() => setRememberMe(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 ${rememberMe ? 'bg-brand-orange' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${rememberMe ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-gray-500">Permanecer conectado</span>
            </label>
            <button type="button" onClick={() => { setTelaEsqueci(true); setError('') }}
              className="text-xs text-brand-orange font-medium hover:underline">
              Esqueci a senha
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
