import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import AudioRecorder from '../components/AudioRecorder'
import BaekseokLogo from '../components/BaekseokLogo'

export default function Test() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]             = useState('intro')
  const [questions, setQuestions]   = useState([])
  const [testId, setTestId]         = useState(null)
  const [qIndex, setQIndex]         = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const responseRef = useRef({})
  const [recorded, setRecorded]     = useState(false)

  useEffect(() => {
    api.get('/questions').then(r => setQuestions(r.data))
  }, [])

  const startTest = async () => {
    try {
      const { data } = await api.post('/tests/start')
      setTestId(data.id)
      if (data.responses?.length) {
        const answeredIds = new Set(data.responses.map(r => r.question_id))
        const nextIdx = questions.findIndex(q => !answeredIds.has(q.id))
        setQIndex(nextIdx >= 0 ? nextIdx : questions.length)
      }
      setStep('question')
    } catch (err) {
      setError(err.response?.data?.detail || '시험 시작 오류')
    }
  }

  const handleRecordingComplete = (blob, transcript, duration) => {
    if (!questions[qIndex]) return
    responseRef.current[questions[qIndex].id] = { blob, transcript, duration }
    setRecorded(true)
  }

  const submitAndNext = async () => {
    const q   = questions[qIndex]
    const rec = responseRef.current[q?.id]
    if (!rec?.blob) {
      setError('녹음을 먼저 완료해주세요. / Please record your answer first.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const formData = new FormData()
      const ext = rec.blob.type.includes('ogg') ? '.ogg' : rec.blob.type.includes('mp4') ? '.mp4' : '.webm'
      formData.append('audio', rec.blob, `response${ext}`)
      formData.append('transcript', rec.transcript || '')
      formData.append('duration', String(rec.duration))
      await api.post(`/tests/${testId}/responses/${q.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (qIndex + 1 < questions.length) {
        setQIndex(qIndex + 1)
        setRecorded(false)
      } else {
        await api.post(`/tests/${testId}/complete`)
        navigate('/complete')
      }
    } catch (err) {
      setError(err.response?.data?.detail || '제출 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const q = questions[qIndex]

  // ── 인트로 ─────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-700 to-indigo-800">
        <header className="px-5 py-4">
          <BaekseokLogo size="sm" dark />
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-7">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📋</div>
              <h1 className="text-xl font-bold text-slate-800">English Speaking Test</h1>
              <p className="text-slate-500 text-sm mt-1">안녕하세요, <strong className="text-blue-600">{user?.name}</strong>님!</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 text-sm text-slate-700 mb-6 space-y-2 border border-blue-100">
              <p className="font-semibold text-blue-700 mb-1">📌 시험 안내</p>
              <p>• 총 <strong>5개 질문</strong>에 영어로 답하세요.</p>
              <p>• 각 질문마다 <strong>준비 시간</strong> 후 녹음이 시작됩니다.</p>
              <p>• 최대 <strong>60초</strong>까지 녹음 가능합니다.</p>
              <p>• 마음에 안 들면 <strong>다시 녹음</strong>할 수 있습니다.</p>
              <p className="text-xs text-slate-400 pt-1">Speak naturally in English. Just do your best!</p>
            </div>

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <button
              onClick={startTest}
              disabled={questions.length === 0}
              className="btn-primary w-full text-base py-4 rounded-2xl"
            >
              시험 시작 / Start Test →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 시험 화면 ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">

      {/* 상단 헤더 */}
      <header className="bg-white shadow-sm px-5 py-3 flex items-center justify-between">
        <BaekseokLogo size="sm" />
        <div className="text-right">
          <p className="text-xs text-slate-400">Question</p>
          <p className="font-bold text-blue-600 text-lg leading-tight">
            {qIndex + 1} <span className="text-slate-300 font-normal">/</span> {questions.length}
          </p>
        </div>
      </header>

      {/* 진행 바 */}
      <div className="h-1.5 bg-slate-200">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto px-4 py-5">
        <div className="max-w-lg mx-auto space-y-4">

          {/* 질문 카드 */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="bg-blue-600 text-white text-sm font-bold w-8 h-8 rounded-full
                               flex items-center justify-center flex-shrink-0 mt-0.5">
                {qIndex + 1}
              </span>
              <p className="text-lg font-semibold text-slate-800 leading-snug">
                {q?.text}
              </p>
            </div>
            {q?.hint && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-sm text-yellow-800">
                <span className="font-medium">💡 </span>{q.hint}
              </div>
            )}
          </div>

          {/* 녹음 카드 */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center">
            <AudioRecorder
              key={qIndex}
              onRecordingComplete={handleRecordingComplete}
              maxSeconds={q?.max_seconds || 60}
              prepSeconds={q?.prep_seconds || 15}
              disabled={submitting}
            />
          </div>

          {/* 에러 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* 다음 버튼 */}
          <button
            onClick={submitAndNext}
            disabled={submitting || !recorded}
            className="btn-primary w-full text-base py-4 rounded-2xl"
          >
            {submitting
              ? '저장 중… / Saving…'
              : qIndex + 1 < questions.length
                ? `다음 질문 / Next (${qIndex + 2}/${questions.length}) →`
                : '시험 제출 / Submit ✓'}
          </button>

          <p className="text-center text-xs text-slate-400 pb-4">
            녹음 완료 후 버튼이 활성화됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
