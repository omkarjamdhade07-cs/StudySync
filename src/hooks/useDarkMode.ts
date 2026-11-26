/**
 * Shared dark mode hook backed by localStorage.
 * Import and call this in any component to read or toggle dark mode.
 */
import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    localStorage.getItem('studysync_theme') === 'dark' ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('studysync_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggle = () => setDarkMode(d => !d)

  return { darkMode, toggle, setDarkMode }
}
