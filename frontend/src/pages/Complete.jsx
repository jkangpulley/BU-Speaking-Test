import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import BaekseokLogo from '../components/BaekseokLogo'

export default function Complete() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-600 to-teal-700">

      <header className="px-5 py-4">
        <BaekseokLogo size="sm" dark />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* 완료 아이콘 */}
          <div className="text-center mb-6">
            <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-6xl">🎉</span>
            </div>
            <h1 className="text-2xl font-bold text-white">시험 완료!</h1>
            <p className="text-green-200 text-sm mt-1">Test Complete</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-7 space-y-4">
            <div className="text-center">
              <p className="text-slate-600">
                수고하셨습니다,<br />
                <strong className="text-blue-600 text-lg">{user?.name}</strong>님!
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-slate-700 space-y-1.5">
              <p className="font-semibold text-green-700">✅ 모든 답변이 저장되었습니다</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                채점 및 반 배정 결과는 담당 선생님을 통해<br />안내받으실 수 있습니다.<br />
                <span className="text-slate-400">Your placement will be announced by your teacher.</span>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-slate-600">
              <p className="font-medium text-blue-700 mb-1">📌 안내</p>
              <p>이제 이 창을 닫으셔도 됩니다.</p>
              <p className="text-xs text-slate-400 mt-0.5">You may close this window.</p>
            </div>

            <button onClick={handleLogout} className="btn-secondary w-full rounded-2xl py-3.5">
              로그아웃 / Logout
            </button>
          </div>

          <p className="text-center text-green-200 text-xs mt-5 leading-relaxed">
            © 2026 백석대학교 · Baekseok University<br />
            Центр английского языка
          </p>
        </div>
      </div>
    </div>
  )
}
