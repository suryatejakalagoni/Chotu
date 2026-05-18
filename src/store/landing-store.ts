import { create } from 'zustand'

export type LandingSection = 'hero' | 'assignments' | 'expenses' | 'community' | 'cta'

interface LandingStore {
  activeSection: LandingSection
  setActiveSection: (s: LandingSection) => void
  reducedMotion: boolean
  setReducedMotion: (v: boolean) => void
}

export const useLandingStore = create<LandingStore>((set) => ({
  activeSection: 'hero',
  setActiveSection: (activeSection) => set({ activeSection }),
  reducedMotion: false,
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}))
