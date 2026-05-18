'use client'

import { useEffect, useCallback, useState } from 'react'
import { Mic, MicOff, Square, Loader2, HelpCircle } from 'lucide-react'
import { useVoiceStore } from '@/store/voice-store'
import { useVoiceInput, isVoiceSupported } from '@/hooks/use-voice-input'
import { createVoiceEntry } from '@/lib/actions/voice'
import { parseVoice } from '@/lib/voice-parser'
import { VoiceHelpModal } from './voice-help-modal'

export function MicButton() {
  const {
    status,
    transcript,
    setStatus,
    setParsedAction,
    setVoiceEntryId,
    setErrorMessage,
    reset,
  } = useVoiceStore()

  const { startListening, stopListening } = useVoiceInput()
  const [helpOpen, setHelpOpen] = useState(false)

  // null = not yet checked (avoids SSR/client hydration mismatch — window is
  // undefined on the server so isVoiceSupported() would differ between renders)
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setSupported(isVoiceSupported())
  }, [])

  // When speech ends → parse + write pending DB row → open confirmation modal
  useEffect(() => {
    if (status !== 'processing') return

    if (!transcript) {
      setStatus('idle')
      return
    }

    async function process() {
      const parsed = parseVoice(transcript)
      setParsedAction(parsed)

      const result = await createVoiceEntry(transcript)
      if (result.error) {
        setStatus('error')
        setErrorMessage(result.error)
        return
      }
      setVoiceEntryId(result.id!)
      setStatus('confirming')
    }

    process()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(() => {
    if (status === 'listening') {
      stopListening()
      return
    }
    if (status === 'idle' || status === 'done' || status === 'error') {
      reset()
      startListening()
    }
  }, [status, startListening, stopListening, reset])

  // Render a stable skeleton while we wait for the client-side check
  if (supported === null) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full animate-pulse">
        <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-3 bg-muted rounded w-48" />
        </div>
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <div className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-muted shrink-0 cursor-not-allowed opacity-50">
          <MicOff size={22} className="text-muted-foreground" />
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 text-xs bg-popover text-popover-foreground border rounded-md px-2 py-1.5 shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
            Your browser doesn&apos;t support voice input. Use Chrome on Android or desktop.
          </span>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-medium text-sm text-muted-foreground">Voice Input unavailable</p>
          <p className="text-xs text-muted-foreground mt-0.5">Use Chrome on Android or desktop.</p>
        </div>
      </div>
    )
  }

  const isListening  = status === 'listening'
  const isProcessing = status === 'processing' || status === 'confirming'
  const isDone       = status === 'done'
  const isDenied     = status === 'denied'
  const isError      = status === 'error'

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
          className={[
            'relative flex items-center justify-center w-14 h-14 rounded-full shrink-0 transition-all duration-200',
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110 animate-pulse'
              : isProcessing
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : isDone
              ? 'bg-green-500 text-white'
              : isDenied || isError
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95',
          ].join(' ')}
        >
          {isProcessing ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isListening ? (
            <Square size={18} fill="currentColor" />
          ) : (
            <Mic size={22} />
          )}
        </button>

        <div className="text-center sm:text-left flex-1 min-w-0">
          <p className="font-medium text-sm">
            {isListening
              ? 'Listening… tap ■ to stop'
              : isProcessing
              ? 'Processing…'
              : isDone
              ? 'Saved!'
              : isDenied
              ? 'Microphone access denied'
              : isError
              ? 'Something went wrong — tap to retry'
              : 'Tap to speak'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
            {isDenied
              ? 'Re-enable microphone in your browser settings, then refresh.'
              : isListening
              ? 'Try: "Spent 150 on lunch" or "Maths assignment due Friday"'
              : 'Works best on Android Chrome. iPhone Safari support is limited.'}
          </p>

          {/* How to use link */}
          {!isListening && !isProcessing && (
            <button
              onClick={() => setHelpOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle size={12} />
              What can I say?
            </button>
          )}
        </div>
      </div>

      <VoiceHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
