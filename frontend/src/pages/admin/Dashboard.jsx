import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import AdminLayout from '../../components/AdminLayout'

const LEVEL_COLORS = {
  A1: 'bg-slate-100 text-slate-600',
  A2: 'bg-green-100 text-green-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-purple-100 text-purple-700',
  C1: 'bg-amber-100 text-amber-700',
}

const STATUS_COLORS = {
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-blue-100 text-blue-700',
  scored:      'bg-green-100 text-green-700',
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    purple:'from-purple-500 to-purple-600',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white shadow-md`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-4xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [scoring, setScoring] = useState(false)
  const [msg, setMsg]         = useState('')

  const loadStats = () => api.get('/admin/stats').then(r => setStats(r.data))

  useEffect(() => { loadStats() }, [])

  const scoreAll = async () => {
    setScoring(true)
    setMsg('')
    try {
      const { data } = await api.post('/admin/score-all')
      setMsg(`채점 시작: ${data.count}개 시험 처리 중... (30초~2분 소요)`)
      setTimeout(() => { loadStats(); setMsg('') }, 60000)
    } catch {
      setMsg('오류가 발생했습니다.')
    } finally {
      setScoring(false)
    }
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96 text-slate-400">
          로딩 중…
        </div>
      </AdminLayout>
    )
  }

  const totalTests = stats.completed_tests + stats.scored_tests + stats.pending_tests

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
            <p className="text-slate-500 text-sm">Speaking Placement Test — Baekseok University</p>
          </div>
          <button
            onClick={loadStats}
            className="btn-secondary text-sm py-2 px-4"
          >
            🔄 새로고침
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="전체 학생" value={stats.total_students} sub="Total students" color="blue" />
          <StatCard label="시험 완료" value={stats.completed_tests} sub="Completed (unscored)" color="amber" />
          <StatCard label="채점 완료" value={stats.scored_tests} sub="Scored" color="green" />
          <StatCard label="반 배정" value={stats.assigned_students} sub="Placed in classes" color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Level distribution */}
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-4">📊 레벨 분포</h2>
            {Object.keys(LEVEL_COLORS).map(level => {
              const count = stats.level_distribution[level] || 0
              const pct   = stats.scored_tests > 0 ? Math.round((count / stats.scored_tests) * 100) : 0
              return (
                <div key={level} className="flex items-center gap-3 mb-2">
                  <span className={`badge ${LEVEL_COLORS[level]} w-10 justify-center`}>{level}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600 w-16 text-right">{count}명 ({pct}%)</span>
                </div>
              )
            })}
          </div>

          {/* Country distribution */}
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-4">🌍 국가별 분포</h2>
            {Object.entries(stats.country_distribution).map(([country, count]) => (
              <div key={country} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-700">{country}</span>
                <span className="font-semibold text-blue-600">{count}명</span>
              </div>
            ))}
            {Object.keys(stats.country_distribution).length === 0 && (
              <p className="text-slate-400 text-sm">데이터 없음</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-4">⚡ 빠른 액션</h2>
          <div className="flex flex-wrap gap-3">
            {stats.completed_tests > 0 && (
              <button
                onClick={scoreAll}
                disabled={scoring}
                className="btn-primary"
              >
                {scoring ? '채점 중…' : `🤖 AI 자동 채점 (${stats.completed_tests}개)`}
              </button>
            )}
            <Link to="/admin/placement" className="btn-secondary">
              🏫 반 배정 실행
            </Link>
            <Link to="/admin/students" className="btn-secondary">
              👥 학생 목록 보기
            </Link>
          </div>
          {msg && (
            <p className="text-sm text-blue-600 mt-3 bg-blue-50 px-4 py-2 rounded-lg">{msg}</p>
          )}
        </div>

        {/* Test progress */}
        <div className="card mt-6">
          <h2 className="font-semibold text-slate-700 mb-4">📋 시험 진행 현황</h2>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: '진행 중', count: stats.pending_tests, color: 'bg-yellow-100 text-yellow-700' },
              { label: '완료 (미채점)', count: stats.completed_tests, color: 'bg-blue-100 text-blue-700' },
              { label: '채점 완료', count: stats.scored_tests, color: 'bg-green-100 text-green-700' },
              { label: '미응시', count: stats.total_students - totalTests, color: 'bg-slate-100 text-slate-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`${color} rounded-xl px-4 py-3 text-center min-w-[100px]`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
