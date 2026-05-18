'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useVoiceStore } from '@/store/voice-store'

function getSpeechRecognitionConstructor(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function isVoiceSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null
}

const SILENCE_TIMEOUT_MS = 8000

export function useVoiceInput() {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setStatus, setTranscript, setEditedTranscript } = useVoiceStore()

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop()
    }, SILENCE_TIMEOUT_MS)
  }, [clearSilenceTimer])

  const startListening = useCallback(() => {
    const SR = getSpeechRecognitionConstructor()
    if (!SR) {
      setStatus('error')
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setStatus('listening')
      setTranscript('')
      setEditedTranscript('')
      resetSilenceTimer()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer()
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      const current = (final || interim).trim()
      setTranscript(current)
      setEditedTranscript(current)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer()
      if (event.error === 'not-allowed') {
        setStatus('denied')
      } else if (event.error === 'no-speech') {
        setStatus('idle')
      } else {
        setStatus('error')
      }
    }

    recognition.onend = () => {
      clearSilenceTimer()
      // Only move to processing if still in listening state (onerror may have already changed it)
      const currentStatus = useVoiceStore.getState().status
      if (currentStatus === 'listening') {
        setStatus('processing')
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setStatus('error')
    }
  }, [setStatus, setTranscript, setEditedTranscript, resetSilenceTimer, clearSilenceTimer])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    recognitionRef.current?.stop()
  }, [clearSilenceTimer])

  useEffect(() => {
    return () => {
      clearSilenceTimer()
      recognitionRef.current?.abort()
    }
  }, [clearSilenceTimer])

  return { startListening, stopListening }
}
