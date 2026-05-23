'use client'

import { createContext, useContext } from 'react'
import type { OwlState } from '@/components/Owl'

interface OwlCtx {
  owlState: OwlState
  setOwlState: (s: OwlState) => void
}

// Default (consumed outside provider) — safe no-op
export const OwlContext = createContext<OwlCtx>({
  owlState: 'idle',
  setOwlState: () => {},
})

export const useOwlState = () => useContext(OwlContext)
