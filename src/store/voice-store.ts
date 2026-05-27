'use client'

import { create } from 'zustand'
import type { ParsedAction } from '@/lib/voice-parser'

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'   // speech ended, creating DB entry + parsing
  | 'confirming'   // modal open, waiting for user
  | 'done'         // confirmed + saved
  | 'error'
  | 'denied'       // mic permission denied

export interface SpendingQueryResult {
  total: number
  count: number
  label: string
  category?: string
}

interface VoiceState {
  status: VoiceStatus
  transcript: string
  editedTranscript: string
  parsedAction: ParsedAction | null
  lastConfirmedEntryId: string | null
  errorMessage: string | null
  // Set when server responds to a query_spending confirm — keeps modal open
  queryResult: SpendingQueryResult | null
  // Set for attendance_placeholder — keeps modal open with info
  infoMessage: string | null

  setStatus: (s: VoiceStatus) => void
  setTranscript: (t: string) => void
  setEditedTranscript: (t: string) => void
  setParsedAction: (a: ParsedAction | null) => void
  setLastConfirmedEntryId: (id: string | null) => void
  setErrorMessage: (msg: string | null) => void
  setQueryResult: (r: SpendingQueryResult | null) => void
  setInfoMessage: (msg: string | null) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as VoiceStatus,
  transcript: '',
  editedTranscript: '',
  parsedAction: null,
  lastConfirmedEntryId: null,
  errorMessage: null,
  queryResult: null,
  infoMessage: null,
}

export const useVoiceStore = create<VoiceState>()((set) => ({
  ...initialState,

  setStatus:              (status)              => set({ status }),
  setTranscript:          (transcript)          => set({ transcript }),
  setEditedTranscript:    (editedTranscript)    => set({ editedTranscript }),
  setParsedAction:        (parsedAction)        => set({ parsedAction }),
  setLastConfirmedEntryId:(lastConfirmedEntryId)=> set({ lastConfirmedEntryId }),
  setErrorMessage:        (errorMessage)        => set({ errorMessage }),
  setQueryResult:         (queryResult)         => set({ queryResult }),
  setInfoMessage:         (infoMessage)         => set({ infoMessage }),

  reset: () =>
    set({
      status: 'idle',
      transcript: '',
      editedTranscript: '',
      parsedAction: null,
      errorMessage: null,
      queryResult: null,
      infoMessage: null,
      // intentionally keep lastConfirmedEntryId so undo button stays visible
    }),
}))
