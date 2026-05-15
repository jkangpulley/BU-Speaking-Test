import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/client'
import AdminLayout from '../../components/AdminLayout'

const CRITERIA = [
  { key: 'task_completion', label: '과제 완성도', icon: '✅' },
  { key: 'fluency',         label: '유창성',      icon: '🗣' },
  { key: 'vocabulary',      label: '어휘력',      icon: '📚' },
  { key: 'grammar',         label: '문법',        icon: '📝' },
  { key: 'communication',   label: '의사소통',    icon: '💬' },
]

const LEVEL_COLORS = {
  A1: 'bg-slate-100 text-slate-600',
  A2: 'bg-green-100 text-green-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-purple-100 text-purple-700',
  C1: 'bg-amber-100 text-amber-700',
}

function ScoreBar({ score, max = 4 }) {
  const pct = (score / max) * 100
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8">{score}/4</span>
    </div>
  )
}

export default function StudentDetail() {
  const { id }  = useParams()
  const [student, setStudent]   = useState(null)
  const [questions, setQuestions] = useState([])
  const [scoring, setScoring]   = useState(false)
  const [msg, setMsg]           = useState('')

  const load = () => {
    Promise.all([
      api.get(`/admin/students/${id}`),
      api.get('/questions'),
    ]).then(([sRes, qRes]) => {
      setStudent(sRes.data)
      setQuestions(qRes.data)
    })
  }

  useEffect(() => { load() }, [id])

  const triggerScoring = async (testId) => {
    setScoring(true)
    setMsg('')
    try {
      await api.post(`/admin/score/${testId}`)
      setMsg('채점이 시작되었습니다. 30초 후 새로고침하세요.')
      setTimeout(() => { load(); setMsg('') }, 35000)
    } catch {
      setMsg('채점 오류가 발생했습니다.')
    } finally {
      setScoring(false)
    }
  }

  const triggerRescore = async (testId) => {
    setScoring(true)
    setMsg('')
    try {
      await api.post(`/admin/rescore/${testId}`)
      setMsg('재채점이 시작되었습니다. 30초 후 새로고침하세요.')
      setTimeout(() => { load(); setMsg('') }, 35000)
    } catch {
      setMsg('재채점 오류가 발생했습니다.')
    } finally {
      setScoring(false)
    }
  }

  if (!student) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96 text-slate-400">로딩 중…</div>
      </AdminLayout>
    )
  }

  const latestTest = student.tests.slice().sort((a, b) => b.id - a.id)[0]
  const qMap = Object.fromEntries(questions.map(q => [q.id, q]))

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link to="/admin/students" className="hover:text-blue-600">학생 목록</Link>
          <span>/</span>
          <span className="text-slate-700">{student.name}</span>
        </div>

        {/* Student header */}
        <div className="card mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
            <p className="text-slate-500 text-sm">@{student.username}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="badge bg-slate-100 text-slate-600">{student.country}</span>
              <span className="badge bg-slate-100 text-slate-600">{student.age_group} {student.grade || ''}</span>
              {student.class_name && (
                <span className="badge bg-blue-100 text-blue-700">반: {student.class_name}</span>
              )}
            </div>
          </div>
          {latestTest && (
            <div className="text-right">
              {latestTest.total_score != null && (
                <>
                  <p className="text-4xl font-bold text-blue-600">{latestTest.total_score.toFixed(1)}</p>
                  <p className="text-xs text-slate-400">/ 100점</p>
                  {latestTest.level && (
                    <span className={`badge mt-1 ${LEVEL_COLORS[latestTest.level]}`}>
                      {latestTest.level}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Tests */}
        {student.tests.length === 0 ? (
          <div className="card text-center text-slate-400 py-12">아직 시험 기록이 없습니다.</div>
        ) : (
          student.tests.slice().sort((a, b) => b.id - a.id).map(test => (
            <div key={test.id} className="card mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-slate-700">
                    시험 #{test.id}
                    <span className={`ml-2 badge ${
                      test.status === 'scored' ? 'bg-green-100 text-green-700' :
                      test.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {test.status === 'scored' ? '채점 완료' : test.status === 'completed' ? '완료' : '진행 중'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    시작: {new Date(test.started_at).toLocaleString('ko-KR')}
                    {test.completed_at && ` · 완료: ${new Date(test.completed_at).toLocaleString('ko-KR')}`}
                  </p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {test.status === 'completed' && (
                    <button
                      onClick={() => triggerScoring(test.id)}
                      disabled={scoring}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {scoring ? '채점 중…' : '🤖 AI 채점'}
                    </button>
                  )}
                  {test.status === 'scored' && (
                    <button
                      onClick={() => triggerRescore(test.id)}
                      disabled={scoring}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      {scoring ? '재채점 중…' : '🔄 재채점'}
                    </button>
                  )}
                  <button onClick={load} className="btn-secondary text-sm py-2 px-4">🔄 새로고침</button>
                </div>
              </div>

              {msg && (
                <p className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg mb-4">{msg}</p>
              )}

              {/* Responses */}
              <div className="space-y-4">
                {test.responses.map((resp, idx) => {
                  const q = qMap[resp.question_id]
                  return (
                    <div key={resp.id} className="border border-slate-100 rounded-xl p-4">
                      <p className="text-sm font-semibold text-slate-600 mb-1">
                        Q{idx + 1}. {q?.text || `Question ${resp.question_id}`}
                      </p>

                      {/* Audio player */}
                      {resp.audio_path && (
                        <audio
                          controls
                          src={`/api/admin/audio/${resp.audio_path}`}
                          className="w-full mb-3 mt-2"
                        />
                      )}

                      {/* Transcript */}
                      {resp.transcript && (
                        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 mb-3 italic border border-slate-100">
                          "{resp.transcript}"
                        </div>
                      )}

                      {/* Scores */}
                      {resp.scored_at ? (
                        <div className="space-y-2">
                          {CRITERIA.map(({ key, label, icon }) => (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm w-32 text-slate-600 flex-shrink-0">
                                {icon} {label}
                              </span>
                              <ScoreBar score={resp[key] ?? 0} />
                            </div>
                          ))}
                          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 mt-2">
                            <span className="text-sm font-semibold w-32 text-slate-700">합계</span>
                            <span className="font-bold text-blue-600">{resp.total_score?.toFixed(1) ?? 0} / 20</span>
                          </div>
                          {resp.feedback && (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800 mt-2">
                              💬 {resp.feedback}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">미채점</p>
                      )}
                    </div>
                  )
                })}

                {test.responses.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">답변 없음</p>
                )}
              </div>

              {/* Total */}
              {test.total_score != null && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">총점</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">{test.total_score.toFixed(1)}</span>
                    <span className="text-slate-400"> / 100</span>
                    {test.level && (
                      <span className={`ml-3 badge ${LEVEL_COLORS[test.level]}`}>{test.level}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  )
}
