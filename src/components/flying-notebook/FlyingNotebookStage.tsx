import { useEffect, useRef, type ReactNode } from 'react'
import { registerStage, type StageConfig } from './stageRegistry'
import { cn } from '@/lib/utils'

/**
 * An empty slot the flying notebook flies to. It draws nothing itself — the notebook is
 * rendered on a canvas above the page — so size it like any other block and the
 * book will fit to it. Children render underneath the book: use them for a
 * stand-in that shows until the 3D chunk has loaded (or if WebGL is missing).
 */
export default function FlyingNotebookStage({ id, className, children, ...config }: StageConfig & {
  id: string
  className?: string
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // The engine reads this object each frame; keep it current without
  // re-registering whenever a parent re-renders.
  const configRef = useRef<StageConfig>(config)
  configRef.current = config

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return registerStage({
      id,
      el,
      get config() { return configRef.current },
    })
  }, [id])

  return (
    <div ref={ref} data-flying-notebook-stage={id} className={cn('flying-notebook-stage', className)}>
      {children}
    </div>
  )
}
