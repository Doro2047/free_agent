import { useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAppStore } from '@/stores/appStore'
import { Toaster } from 'sonner'

function ThemeManager() {
  const { theme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark)
      root.style.colorScheme = isDark ? 'dark' : 'light'
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  return null
}

function AnimationPreferenceManager() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      document.documentElement.classList.add('reduce-motion')
    }

    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('reduce-motion', e.matches)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return null
}

function HighDpiManager() {
  useEffect(() => {
    const setDpiAwareness = () => {
      const dpr = window.devicePixelRatio || 1
      document.documentElement.style.setProperty('--device-pixel-ratio', String(dpr))

      if (dpr > 1) {
        document.documentElement.setAttribute('data-high-dpi', 'true')
      } else {
        document.documentElement.removeAttribute('data-high-dpi')
      }
    }

    setDpiAwareness()
    window.addEventListener('resize', setDpiAwareness)
    return () => window.removeEventListener('resize', setDpiAwareness)
  }, [])

  return null
}

export default function App() {
  return (
    <>
      <ThemeManager />
      <AnimationPreferenceManager />
      <HighDpiManager />
      <MainLayout />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'text-sm font-medium shadow-lg border border-border/30',
          duration: 3000,
          style: {
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            border: '1px solid hsl(var(--border) / 0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
          },
        }}
      />
    </>
  )
}
