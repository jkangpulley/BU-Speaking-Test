import { useState, useEffect } from 'react'
import api from '../../api/client'
import AdminLayout from '../../components/AdminLayout'

const FLAG = { Russia: '🇷🇺', Kazakhstan: '🇰🇿', Uzbekistan: '🇺🇿' }

const LEVEL_COLORS = {
  A1: { bg: 'bg-slate-50 border-slate-200',  badge: 'bg-slate-100 text-slate-700',  bar: 'bg-slate-400' },
  A2: { bg: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',  bar: 'bg-green-500' },
  B1: { bg: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700',    bar: 'bg-blue-500' },
  B2: { bg: 'bg-purple-50 border-purple-200',badge: 'bg-purple-100 text-purple-700',bar: 'bg-purple-500' },
  C1: { bg: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700',  bar: 'bg-amber-500' },
}

const LEVEL_DESCRIPTIONS = {
  A1: '입문 — Beginner',
  A2: '초급 — Elementary',
  B1: '중급 — Pre-Intermediate',
  B2: '중상급 — Upper-Intermediate',
  C1: '고급 — Advanced',
}

export default function Placement() {
  const [classes, setClasses]     = useState([])
  const [running, setRunning]     = useState(false)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [expandedClass, setExpanded] = useState(null)

  const loadClasses = () => {
    setLoading(true)
    api.get('/admin/classes')
      .then(r => setClasses(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadClasses() }, [])

  const runPlacement = async () => {
    setRunning(true)
    setResult(null)
    try {
      const { data } = await api.post('/admin/placement/run')
      setResult(data)
      loadClasses()
    } catch (e) {
      setResult({ error: e.response?.data?.detail || '오류 발생' })
    } finally {
      setRunning(false)
    }
  }

  // Group classes by level
  const byLevel = {}
  for (const cls of classes) {
    if (!byLevel[cls.level]) byLevel[cls.level] = []
    byLevel[cls.level].push(cls)
  }

  const totalAssigned = classes.reduce((s, c) => s + c.student_count, 0)

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">반 배정</h1>
            <p className="text-slate-500 text-sm">
              CEFR 레벨별 자동 배정 — 최대 20명/반
            </p>
          </div>
          <button
            onClick={runPlacement}
            disabled={running}
            className="btn-primary"
          >
            {running ? '배정 중…' : '🔄 반 배정 실행 (재실행 가능)'}
          </button>
        </div>

        {/* Algorithm explanation */}
        <div className="card mb-6 bg-blue-50 border border-blue-100">
          <h2 className="font-semibold text-blue-700 mb-2">📐 배정 알고리즘</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>① 채점 완료된 학생을 CEFR 레벨(A1~C1)로 그룹화</li>
            <li>② 같은 레벨 내에서 점수 높은 순으로 정렬</li>
            <li>③ 20명씩 순서대로 반 배정 (A반 → B반 → …)</li>
            <li>④ 이전 배정은 자동으로 초기화 후 재배정</li>
          </ul>
        </div>

        {/* Result summary */}
        {result && !result.error && (
          <div className="card mb-6 border-green-200 bg-green-50">
            <p className="font-semibold text-green-700">
              ✅ 배정 완료: {result.classes_created}개 반, {result.students_assigned}명 배정
            </p>
          </div>
        )}
        {result?.error && (
          <div className="card mb-6 border-red-200 bg-red-50">
            <p className="text-red-600">❌ {result.error}</p>
          </div>
        )}

        {/* Summary stats */}
        {classes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
              <p className="text-sm text-slate-500 mt-1">총 반 수</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">{totalAssigned}</p>
              <p className="text-sm text-slate-500 mt-1">배정된 학생</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">{Object.keys(byLevel).length}</p>
              <p className="text-sm text-slate-500 mt-1">레벨 수</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-amber-600">
                {classes.length > 0 ? (totalAssigned / classes.length).toFixed(1) : 0}
              </p>
              <p className="text-sm text-slate-500 mt-1">평균 인원/반</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400">로딩 중…</div>
        ) : classes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🏫</div>
            <p className="text-slate-500">배정된 반이 없습니다.</p>
            <p className="text-slate-400 text-sm mt-1">
              채점이 완료된 학생이 있으면 위 버튼으로 배정하세요.
            </p>
          </div>
        ) : (
          ['A1', 'A2', 'B1', 'B2', 'C1'].map(level => {
            const levelClasses = byLevel[level]
            if (!levelClasses?.length) return null
            const colors = LEVEL_COLORS[level]
            return (
              <div key={level} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`badge ${colors.badge} text-base px-3 py-1`}>{level}</span>
                  <span className="text-slate-600 font-medium">{LEVEL_DESCRIPTIONS[level]}</span>
                  <span className="text-slate-400 text-sm">({levelClasses.length}개 반)</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {levelClasses.map(cls => (
                    <div
                      key={cls.id}
                      className={`border rounded-2xl overflow-hidden ${colors.bg}`}
                    >
                      {/* Class header */}
                      <button
                        onClick={() => setExpanded(expandedClass === cls.id ? null : cls.id)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-slate-700">{cls.name}</span>
                          <span className="text-sm text-slate-500">
                            {cls.student_count} / {cls.capacity}명
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Mini capacity bar */}
                          <div className="w-24 h-2 bg-white rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} rounded-full`}
                              style={{ width: `${(cls.student_count / cls.capacity) * 100}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-sm">
                            {expandedClass === cls.id ? '▲' : '▼'}
                          </span>
                        </div>
                      </button>

                      {/* Expanded student list */}
                      {expandedClass === cls.id && (
                        <div className="border-t border-white/50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-white/40">
                                <th className="text-left px-4 py-2 text-slate-500 font-medium">#</th>
                                <th className="text-left px-4 py-2 text-slate-500 font-medium">이름</th>
                                <th className="text-left px-4 py-2 text-slate-500 font-medium">국가</th>
                                <th className="text-left px-4 py-2 text-slate-500 font-medium">구분</th>
                                <th className="text-right px-4 py-2 text-slate-500 font-medium">점수</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cls.students.map((s, idx) => (
                                <tr key={s.id} className="border-t border-white/30 hover:bg-white/30">
                                  <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                                  <td className="px-4 py-2 font-medium text-slate-700">{s.name}</td>
                                  <td className="px-4 py-2 text-slate-500">
                                    {FLAG[s.country] || ''} {s.country}
                                  </td>
                                  <td className="px-4 py-2 text-slate-500 capitalize">{s.age_group}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-slate-700">
                                    {s.score != null ? s.score.toFixed(1) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </AdminLayout>
  )
}
