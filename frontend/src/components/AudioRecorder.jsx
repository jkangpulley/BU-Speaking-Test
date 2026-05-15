import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * AudioRecorder
 * Props:
 *  - onRecordingComplete(blob, transcript, durationSec)
 *  - maxSeconds   (default 60)
 *  - prepSeconds  (default 15)
 *  - disabled
 */
export default function AudioRecorder({
  onRecordingComplete,
  maxSeconds = 60,
  prepSeconds = 15,
  disabled = false,
}) {
  const [phase, setPhase] = useState('idle')       // idle | prep | recording | done
  const [countdown, setCountdown]   = useState(0)
  const [elapsed, setElapsed]       = useState(0)
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl]     = useState(null)
  const [hasAudio, setHasAudio]     = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const recognitionRef   = useRef(null)
  const timerRef         = useRef(null)
  const startTimeRef     = useRef(null)
  const blobRef          = useRef(null)
  const transcriptRef    = useRef('')

  // Keep ref in sync for async callbacks
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
    }
    clearInterval(timerRef.current)
  }, [])

  // Auto-stop when maxSeconds reached
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsed(secs)
        if (secs >= maxSeconds) stopRecording()
      }, 500)
    }
    return () => clearInterval(timerRef.current)
  }, [phase, maxSeconds, stopRecording])

  // Prep countdown
  const startPrep = () => {
    if (disabled) return
    setPhase('prep')
    setCountdown(prepSeconds)
    setTranscript('')
    setAudioUrl(null)
    setHasAudio(false)
    setElapsed(0)
    blobRef.current = null

    let remaining = prepSeconds
    const id = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(id)
        startActualRecording()
      }
    }, 1000)
  }

  const startActualRecording = async () => {
    chunksRef.current = []
    transcriptRef.current = ''

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      alert('마이크 접근 권한이 필요합니다.\nPlease allow microphone access.')
      setPhase('idle')
      return
    }

    // MediaRecorder
    const mr = new MediaRecorder(stream, { mimeType: getSupportedMimeType() })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setHasAudio(true)
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setPhase('done')
      onRecordingComplete(blob, transcriptRef.current, duration)
    }
    mr.start(200)

    // Web Speech API (best-effort)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      recognitionRef.current = rec
      rec.lang = 'en-US'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (event) => {
        let final = ''
        for (const r of event.results) {
          if (r.isFinal) final += r[0].transcript + ' '
        }
        if (final) {
          setTranscript(prev => (prev + ' ' + final).trim())
        }
      }
      rec.onerror = () => {}
      try { rec.start() } catch (_) {}
    }

    startTimeRef.current = Date.now()
    setElapsed(0)
    setPhase('recording')
  }

  const handleStop = () => {
    stopRecording()
  }

  const handleReRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setPhase('idle')
    setAudioUrl(null)
    setHasAudio(false)
    setTranscript('')
    setElapsed(0)
  }

  const pct = Math.min((elapsed / maxSeconds) * 100, 100)
  const remaining = Math.max(maxSeconds - elapsed, 0)

  return (
    <div className="flex flex-col items-center gap-6">

      {/* IDLE */}
      {phase === 'idle' && (
        <button
          onClick={startPrep}
          disabled={disabled}
          className="btn-primary flex items-center gap-3 text-lg px-8 py-4"
        >
          <span className="text-2xl">🎤</span>
          준비 시작 / Start Preparation
        </button>
      )}

      {/* PREP */}
      {phase === 'prep' && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl font-bold text-blue-600">{countdown}</div>
          <p className="text-slate-500 text-sm">준비하세요 — 곧 녹음이 시작됩니다</p>
          <p className="text-slate-400 text-xs">Get ready — recording starts soon</p>
        </div>
      )}

      {/* RECORDING */}
      {phase === 'recording' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={handleStop}
            className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white
                       flex items-center justify-center text-4xl recording-pulse transition-all"
          >
            ⏹
          </button>
          <p className="text-red-500 font-semibold animate-pulse">● 녹음 중 / Recording…</p>

          {/* Timer bar */}
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{elapsed}s</span>
              <span>남은 시간 / {remaining}s left</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 timer-bar-fill rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Live transcript */}
          {transcript && (
            <div className="w-full max-w-sm bg-blue-50 rounded-xl p-3 text-sm text-slate-600 border border-blue-100">
              <p className="text-xs text-blue-400 mb-1 font-medium">실시간 인식 / Live transcript</p>
              {transcript}
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && hasAudio && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <span className="text-2xl">✅</span>
            녹음 완료! / Recording complete!
          </div>
          <audio controls src={audioUrl} className="w-full" />
          <p className="text-xs text-slate-400 text-center">
            다시 녹음하려면 아래 버튼을 누르세요.<br />
            Press below to re-record.
          </p>
          <button onClick={handleReRecord} className="btn-secondary text-sm py-2 px-4">
            🔄 다시 녹음 / Re-record
          </button>
        </div>
      )}
    </div>
  )
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}
