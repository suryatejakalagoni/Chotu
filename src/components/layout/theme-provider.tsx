'use client'

import { useEffect } from 'react'

/** Null-render client component — runs once on mount to sync localStorage theme. */
export function ThemeProvider() {
  useEffect(() => {
    const saved = localStorage.getItem('chotu-theme')
    if (saved === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
      if (!saved) localStorage.setItem('chotu-theme', 'dark')
    }
  }, [])

  return null
}
