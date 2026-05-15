import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import BaekseokLogo from '../components/BaekseokLogo'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      login(data)
      navigate(data.role === 'admin' ? '/admin' : '/test')
    } catch (err) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-700 to-indigo-800">

      {/* 상단 로고 바 */}
      <header className="px-6 py-4">
        <BaekseokLogo size="sm" dark />
      </header>

      {/* 메인 */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* 타이틀 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎤</div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              English Speaking<br />Placement Test
            </h1>
            <p className="text-blue-200 text-sm mt-1">영어 말하기 배치고사</p>
            <p className="text-blue-300 text-xs mt-0.5">Тест на уровень владения английским</p>
          </div>

          {/* 카드 */}
          <div className="bg-white rounded-3xl shadow-2xl p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  아이디 / Username / Имя пользователя
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="input text-base"
                  placeholder="Username"
                  required
                  autoFocus
                  autoCapitalize="none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  비밀번호 / Password / Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input text-base"
                  placeholder="Password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-base py-4 mt-2 rounded-2xl"
              >
                {loading ? '로그인 중… / Logging in… / Вход…' : '로그인 / Login / Войти'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
              시험 중 브라우저를 닫지 마세요.<br />
              Do not close the browser during the test.<br />
              Не закрывайте браузер во время теста.
            </p>
          </div>

          <p className="text-center text-blue-300 text-xs mt-5 leading-relaxed">
            © 2026 백석대학교 · Baekseok University<br />
            Центр английского языка
          </p>
        </div>
      </div>
    </div>
  )
}
