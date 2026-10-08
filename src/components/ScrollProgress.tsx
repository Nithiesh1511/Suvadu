import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * A thin ink line across the very top of the screen that fills as the page is
 * read. Scaled with `transform` from a single passive scroll listener (batched
 * to one write per frame), so it costs nothing while the page is still.
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    // A new route changes the page's length; measure again once it has rendered.
    const settle = window.setTimeout(schedule, 150)
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.clearTimeout(settle)
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [pathname])

  return <div ref={ref} className="scroll-progress" aria-hidden />
}
