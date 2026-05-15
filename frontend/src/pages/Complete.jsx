import { useAuth } from '../context/AuthContext'

export default function Complete() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl mb-6 animate-bounce">🎉</div>

        <div className="card">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            시험 완료! / Test Complete!
          </h1>
          <p className="text-slate-500 mb-6">
            수고하셨습니다, <strong className="text-blue-600">{user?.name}</strong>님!
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-slate-700 space-y-2 mb-6">
            <p className="font-semibold text-green-700 text-base">✅ 모든 답변이 저장되었습니다</p>
            <p>Your responses have been recorded successfully.</p>
            <p className="text-slate-500 mt-2">
              채점 및 반 배정 결과는 담당 선생님을 통해 안내받으실 수 있습니다.<br/>
              Your class placement will be announced by your teacher.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-slate-600 mb-6">
            <p className="font-medium text-blue-700 mb-1">📌 안내사항</p>
            <p>이제 이 창을 닫으셔도 됩니다.</p>
            <p className="text-slate-400 text-xs mt-1">You may now close this window.</p>
          </div>

          <button
            onClick={logout}
            className="btn-secondary w-full"
          >
            로그아웃 / Logout
          </button>
        </div>

        <p className="text-slate-400 text-sm mt-4">
          English Education Center · Baekseok University
        </p>
      </div>
    </div>
  )
}
