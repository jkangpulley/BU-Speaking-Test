import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import AudioRecorder from '../components/AudioRecorder'

const LEVEL_LABELS = { 1: 'Warm-up', 2: 'Elementary', 3: 'Intermediate', 4: 'Upper-Intermediate', 5: 'Advanced' }

export default function Test() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]           = useState('intro')    // intro | question | submitting | done
  const [questions, setQuestions] = useState([])
  const [testId, setTestId]       = useState(null)
  const [qIndex, setQIndex]       = useState(0)
  const [responses, setResponses] = useState({})         // questionId -> {blob, transcript, duration}
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const responseRef = useRef({})

  useEffect(() => {
    api.get('/questions').then(r => setQuestions(r.data))
  }, [])

  const startTest = async () => {
    try {
      const { data } = await api.post('/tests/start')
      setTestId(data.id)
      // If test was already in progress, figure out which question to resume
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
    const qId = questions[qIndex].id
    responseRef.current[qId] = { blob, transcript, duration }
    setResponses(prev => ({ ...prev, [qId]: { blob, transcript, duration } }))
  }

  const submitCurrentAndNext = async () => {
    const q = questions[qIndex]
    if (!q) return
    const rec = responseRef.current[q.id]
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
      } else {
        // All questions answered — complete test
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
  const currentResponse = q ? responseRef.current[q.id] : null

  // ── Intro ────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-lg w-full card text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            English Speaking Placement Test
          </h1>
          <p className="text-slate-500 mb-6">Baekseok University</p>

          <div className="bg-blue-50 rounded-xl p-5 text-left text-sm text-slate-700 mb-6 space-y-2 border border-blue-100">
            <p className="font-semibold text-blue-700 mb-2">📌 시험 안내 / Instructions</p>
            <p>• 총 <strong>5개의 질문</strong>에 영어로 답하세요. (5 questions in English)</p>
            <p>• 각 질문은 <strong>15–20초 준비 시간</strong> 후 녹음이 시작됩니다.</p>
            <p>• 최대 <strong>60초</strong>까지 녹음할 수 있습니다.</p>
            <p>• 마음에 들지 않으면 <strong>다시 녹음</strong>할 수 있습니다.</p>
            <p>• 시험이 끝나면 창을 닫지 마세요.</p>
            <p className="text-xs text-slate-400 pt-2">Please speak clearly and naturally. There are no right or wrong answers — just do your best!</p>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            안녕하세요, <strong className="text-blue-600">{user?.name}</strong>님! 준비가 되면 시작하세요.
          </p>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={startTest}
            disabled={questions.length === 0}
            className="btn-primary w-full text-lg"
          >
            시험 시작 / Start Test →
          </button>
        </div>
      </div>
    )
  }

  // ── Question ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Question {qIndex + 1} of {questions.length}</span>
            <span className="font-medium text-blue-600">
              {LEVEL_LABELS[q?.difficulty] || ''}
            </span>
          </div>
          <div className="h-2 bg-white rounded-full shadow-inner">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="card mb-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="bg-blue-600 text-white text-sm font-bold w-8 h-8 rounded-full
                             flex items-center justify-center flex-shrink-0">
              {qIndex + 1}
            </span>
            <p className="text-xl font-semibold text-slate-800 leading-relaxed">
              {q?.text}
            </p>
          </div>
          {q?.hint && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
              <span className="font-medium">💡 Hint: </span>{q.hint}
            </div>
          )}
        </div>

        {/* Recorder */}
        <div className="card mb-6">
          <AudioRecorder
            key={qIndex}
            onRecordingComplete={handleRecordingComplete}
            maxSeconds={q?.max_seconds || 60}
            prepSeconds={q?.prep_seconds || 15}
            disabled={submitting}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Next button */}
        <button
          onClick={submitCurrentAndNext}
          disabled={submitting || !currentResponse?.blob}
          className="btn-primary w-full text-lg"
        >
          {submitting
            ? '제출 중… / Submitting…'
            : qIndex + 1 < questions.length
              ? `다음 질문 / Next Question (${qIndex + 2}/${questions.length}) →`
              : '시험 제출 / Submit Test ✓'}
        </button>

        <p className="text-center text-xs text-slate-400 mt-3">
          녹음이 완료된 후 다음 버튼이 활성화됩니다.<br />
          The next button activates after recording.
        </p>
      </div>
    </div>
  )
}
