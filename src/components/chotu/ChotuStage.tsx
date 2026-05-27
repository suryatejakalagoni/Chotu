'use client'

import { ChotuOwl, ChotuSpeech } from './ChotuOwl'
import { useChotu } from './useChotu'
import type { ChotuActions } from './useChotu'
import { createContext, useContext } from 'react'

// Context so child components can call chotu.actions without prop drilling
const ChotuContext = createContext<ChotuActions | null>(null)

export function useChotuActions(): ChotuActions | null {
  return useContext(ChotuContext)
}

export function ChotuStage() {
  const chotu = useChotu()
  const { pos, mood, look, speech, hopping, extraClass, talking } = chotu

  return (
    <ChotuContext.Provider value={chotu.actions}>
      <div
        className={[
          'chotu',
          hopping ? 'hopping' : '',
          extraClass,
          mood === 'sleep' ? 'sleeping' : '',
        ].filter(Boolean).join(' ')}
        style={{ left: pos.left, top: pos.top }}
        onClick={chotu.onChotuClick}
        onPointerDown={chotu.onPointerDown}
        onPointerMove={chotu.onPointerMove}
        onPointerUp={chotu.onPointerUp}
        onPointerCancel={chotu.onPointerUp}
      >
        {speech && <ChotuSpeech text={speech} />}
        <ChotuOwl mood={mood} look={look} talking={talking} size={104} />
        {mood === 'sleep' && (
          <>
            <span className="z" style={{ right: -2, top: 14, animationDelay: '0s' }}>z</span>
            <span className="z" style={{ right: 8, top: 0, animationDelay: '1s', fontSize: 14 }}>z</span>
            <span className="z" style={{ right: 18, top: -10, animationDelay: '2s', fontSize: 12 }}>z</span>
          </>
        )}
      </div>
    </ChotuContext.Provider>
  )
}
