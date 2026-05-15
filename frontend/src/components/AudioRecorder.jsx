import { useState, useRef, useEffect, useCallback } from 'react'

export default function AudioRecorder({
  onRecordingComplete,
  maxSeconds = 60,
  prepSeconds = 15,
  disabled = false,
}) {
  const [phase, setPhase]         = useState('idle')
  const [countdown, setCountdown] = useState(0)
  const [elapsed, setElapsed]     = useState(0)
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl]   = useState(null)
  const [hasAudio, setHasAudio]   = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const timerRef         = useRef(null)
  const startTimeRef     = useRef(null)
  const transcriptRef    = useRef('')

  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    clearInterval(timerRef.current)
  }, [])

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

  const startPrep = () => {
    if (disabled) return
    setPhase('prep')
    setCountdown(prepSeconds)
    setTranscript('')
    setAudioUrl(null)
    setHasAudio(false)
    setElapsed(0)

    let remaining = prepSeconds
    const id = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) { clearInterval(id); startActualRecording() }
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

    const mr = new MediaRecorder(stream, { mimeType: getSupportedMimeType() })
    mediaRecorderRef.current = mr
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      const url  = URL.createObjectURL(blob)
      setAudioUrl(url)
      setHasAudio(true)
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setPhase('done')
      onRecordingComplete(blob, transcriptRef.current, duration)
    }
    mr.start(200)

    // Web Speech API — auto-restart on end
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      const startRec = () => {
        const rec = new SR()
        rec.lang = 'en-US'
        rec.continuous = true
        rec.interimResults = true
        rec.onresult = event => {
          let newFinal = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) newFinal += event.results[i][0].transcript + ' '
          }
          if (newFinal.trim()) {
            setTranscript(prev => (prev + ' ' + newFinal).trim())
          }
        }
        rec.onerror = () => {}
        rec.onend = () => {
          if (mediaRecorderRef.current?.state === 'recording') {
            try { startRec() } catch (_) {}
          }
        }
        try { rec.start() } catch (_) {}
      }
      startRec()
    }

    startTimeRef.current = Date.now()
    setElapsed(0)
    setPhase('recording')
  }

  const handleReRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setPhase('idle')
    setAudioUrl(null)
    setHasAudio(false)
    setTranscript('')
    setElapsed(0)
  }

  const pct       = Math.min((elapsed / maxSeconds) * 100, 100)
  const remaining = Math.max(maxSeconds - elapsed, 0)

  return (
    <div className="flex flex-col items-center gap-5">

      {/* IDLE */}
      {phase === 'idle' && (
        <button
          onClick={startPrep}
          disabled={disabled}
          className="w-36 h-36 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95
                     text-white flex flex-col items-center justify-center gap-2
                     shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-5xl">🎤</span>
          <span className="text-sm font-semibold">시작 / Start</span>
        </button>
      )}

      {/* PREP */}
      {phase === 'prep' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-32 h-32 rounded-full bg-amber-100 border-4 border-amber-400
                          flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-amber-600">{countdown}</span>
          </div>
          <p className="text-slate-600 font-medium text-center">
            준비하세요!<br />
            <span className="text-sm text-slate-400">Get ready to speak…</span>
          </p>
        </div>
      )}

      {/* RECORDING */}
      {phase === 'recording' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={stopRecording}
            className="w-36 h-36 rounded-full bg-red-500 hover:bg-red-600 active:scale-95
                       text-white flex flex-col items-center justify-center gap-2
                       shadow-xl transition-all recording-pulse"
          >
            <span className="text-5xl">⏹</span>
            <span className="text-sm font-semibold">중지 / Stop</span>
          </button>

          <p className="text-red-500 font-semibold animate-pulse text-sm">
            ● 녹음 중 / Recording…
          </p>

          {/* 타이머 바 */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{elapsed}초</span>
              <span>남은 시간 {remaining}초</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 timer-bar-fill rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* 실시간 전사 */}
          {transcript && (
            <div className="w-full max-w-xs bg-blue-50 rounded-2xl p-3 text-sm text-slate-600 border border-blue-100">
              <p className="text-xs text-blue-400 mb-1 font-medium">실시간 인식</p>
              <p className="leading-relaxed">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && hasAudio && (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-4xl">✅</span>
          </div>
          <p className="font-semibold text-green-700 text-center">
            녹음 완료!<br />
            <span className="text-sm font-normal text-slate-500">Recording complete</span>
          </p>
          <audio controls src={audioUrl} className="w-full" />
          <button onClick={handleReRecord} className="btn-secondary text-sm py-2.5 px-6 rounded-xl">
            🔄 다시 녹음 / Re-record
          </button>
        </div>
      )}
    </div>
  )
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}
