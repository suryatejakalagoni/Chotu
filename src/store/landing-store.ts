import { create } from 'zustand'

export type LandingSection =
  | 'hero'
  | 'transition'
  | 'assignments'
  | 'exams'
  | 'expenses'
  | 'voice'
  | 'community'
  | 'closer'

function toSection(p: number): LandingSection {
  if (p < 0.12) return 'hero'
  if (p < 0.20) return 'transition'
  if (p < 0.36) return 'assignments'
  if (p < 0.52) return 'exams'
  if (p < 0.65) return 'expenses'
  if (p < 0.78) return 'voice'
  if (p < 0.90) return 'community'
  return 'closer'
}

interface LandingStore {
  scrollProgress: number
  activeSection: LandingSection
  reducedMotion: boolean
  sceneLoaded: boolean
  setScrollProgress: (v: number) => void
  setReducedMotion: (v: boolean) => void
  setSceneLoaded: (v: boolean) => void
}

export const useLandingStore = create<LandingStore>((set) => ({
  scrollProgress: 0,
  activeSection: 'hero',
  reducedMotion: false,
  sceneLoaded: false,
  setScrollProgress: (v) =>
    set({ scrollProgress: v, activeSection: toSection(v) }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setSceneLoaded: (v) => set({ sceneLoaded: v }),
}))
