import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

// ── 3D notebook preview ──────────────────────────────────────────────────────
// A draggable, openable 3D notebook (ported from the client's Three.js prototype)
// wrapped as a reusable React component. Lazy-load it (see usage) so three.js
// stays out of the initial bundle. All WebGL resources are disposed on unmount.

const PURPLE = '#613092'
const PLUM = '#2C1A3E'
const PAGE = '#FAF7FF'
const LILAC = '#F3E8FF'

export default function NotebookPreview3D({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const openBtnRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tagSubRef = useRef<HTMLSpanElement>(null)
  const line1Ref = useRef<HTMLDivElement>(null)
  const line2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ---------- Renderer / Scene / Camera ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.style.cursor = 'grab'
    stage.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 0.35, 7.2)

    function resize() {
      const w = stage!.clientWidth || 1
      const h = stage!.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    // ---------- Lighting ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(3.5, 5, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x9b7bd6, 0.35)
    fill.position.set(-4, 2, -3); scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.4)
    rim.position.set(-2, 3, -5); scene.add(rim)

    // ---------- Ground shadow ----------
    const groundGeo = new THREE.PlaneGeometry(12, 12)
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.62
    ground.receiveShadow = true
    scene.add(ground)

    // ---------- Textures (canvas-drawn) ----------
    const textures: THREE.Texture[] = []
    function track(t: THREE.CanvasTexture) { textures.push(t); return t }

    function makeFrontCoverTexture() {
      const W = 1024, H = 1365
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const ctx = c.getContext('2d')!
      ctx.fillStyle = PLUM; ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.globalAlpha = 0.16; ctx.fillStyle = PURPLE
      ctx.beginPath(); ctx.arc(W * 0.86, H * 0.06, 340, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 0.10
      ctx.beginPath(); ctx.arc(W * 0.92, H * 0.42, 230, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 0.08
      ctx.beginPath(); ctx.arc(W * 0.02, H * 0.92, 210, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'italic 108px "DM Serif Display", serif'
      ctx.fillText('Suvadu', 84, 340)
      ctx.fillStyle = '#C9B8DB'; ctx.font = '400 30px "DM Sans", sans-serif'
      ctx.fillText('Make your mark.', 90, 410)
      ctx.fillText('Mark your Suvadu.', 90, 448)
      ctx.strokeStyle = PURPLE; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(90, H - 210); ctx.lineTo(230, H - 210); ctx.stroke()
      ctx.fillStyle = '#FFFFFF'; ctx.font = '700 26px "DM Sans", sans-serif'
      ctx.fillText('thesuvadu.com', 90, H - 160)
      ctx.fillStyle = '#C9B8DB'; ctx.font = '400 20px "DM Sans", sans-serif'
      ctx.fillText('Premium notebooks, made to trace', 90, H - 122)
      return track(new THREE.CanvasTexture(c))
    }
    function makeBackCoverTexture() {
      const W = 1024, H = 1365
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const ctx = c.getContext('2d')!
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, PURPLE); grad.addColorStop(1, PLUM)
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
      ctx.save(); ctx.globalAlpha = 0.10; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(W * 0.5, H * 0.42, 120 + i * 70, 0, Math.PI * 2); ctx.stroke() }
      ctx.restore()
      ctx.fillStyle = '#F3E8FF'; ctx.font = 'italic 46px "DM Serif Display", serif'
      ctx.textAlign = 'center'; ctx.fillText('Suvadu.', W / 2, H - 130); ctx.textAlign = 'left'
      return track(new THREE.CanvasTexture(c))
    }
    function makeRuledPageTexture() {
      const W = 1024, H = 1365
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const ctx = c.getContext('2d')!
      ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(97,48,146,0.22)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(110, 60); ctx.lineTo(110, H - 60); ctx.stroke()
      ctx.strokeStyle = 'rgba(97,48,146,0.10)'; ctx.lineWidth = 2
      for (let y = 170; y < H - 80; y += 62) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke() }
      ctx.fillStyle = 'rgba(97,48,146,0.08)'; ctx.font = 'italic 26px "DM Serif Display", serif'
      ctx.fillText('Suvadu.', W - 190, H - 40)
      return track(new THREE.CanvasTexture(c))
    }
    function makeSolidTexture(hex: string) {
      const c = document.createElement('canvas'); c.width = c.height = 8
      const ctx = c.getContext('2d')!; ctx.fillStyle = hex; ctx.fillRect(0, 0, 8, 8)
      return track(new THREE.CanvasTexture(c))
    }

    // ---------- Geometry ----------
    const W = 2.1, H = 2.85, D = 0.16, COVER_D = 0.05
    const frontTex = makeFrontCoverTexture()
    const backTex = makeBackCoverTexture()
    const ruledTex = makeRuledPageTexture()
    const spineTex = makeSolidTexture(PURPLE)
    const pageTex = makeSolidTexture(PAGE)
    const insideCoverTex = makeSolidTexture(LILAC)

    const geometries: THREE.BufferGeometry[] = [groundGeo]
    const materials: THREE.Material[] = [groundMat]
    function trackMat<T extends THREE.Material>(m: T) { materials.push(m); return m }

    const book = new THREE.Group()
    scene.add(book)

    const pagesMaterials = [
      trackMat(new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 })),
      trackMat(new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.6 })),
      trackMat(new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 })),
      trackMat(new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 })),
      trackMat(new THREE.MeshStandardMaterial({ map: ruledTex, roughness: 0.85 })),
      trackMat(new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.55, metalness: 0.06 })),
    ]
    const pagesGeo = new THREE.BoxGeometry(W, H, D); geometries.push(pagesGeo)
    const pagesBoard = new THREE.Mesh(pagesGeo, pagesMaterials)
    pagesBoard.castShadow = true; pagesBoard.receiveShadow = true
    book.add(pagesBoard)

    const stackGeo = new THREE.BoxGeometry(D * 0.86, H * 0.965, W * 0.02); geometries.push(stackGeo)
    const stackMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf5f2fa, roughness: 1 }))
    const pageStack = new THREE.Mesh(stackGeo, stackMat)
    pageStack.rotation.y = Math.PI / 2
    pageStack.position.set(W / 2 + 0.001, 0, 0)
    pageStack.castShadow = true
    book.add(pageStack)

    const coverPivot = new THREE.Object3D()
    coverPivot.position.set(-W / 2, 0, D / 2 + COVER_D / 2 + 0.002)
    book.add(coverPivot)

    const coverMaterials = [
      trackMat(new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.6 })),
      trackMat(new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.6 })),
      trackMat(new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.6 })),
      trackMat(new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.6 })),
      trackMat(new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.55, metalness: 0.06 })),
      trackMat(new THREE.MeshStandardMaterial({ map: insideCoverTex, roughness: 0.8 })),
    ]
    const coverGeo = new THREE.BoxGeometry(W, H, COVER_D); geometries.push(coverGeo)
    const coverMesh = new THREE.Mesh(coverGeo, coverMaterials)
    coverMesh.position.set(W / 2, 0, 0)
    coverMesh.castShadow = true
    coverPivot.add(coverMesh)

    const REST_Y = 0.5, REST_X = -0.06
    book.rotation.x = REST_X
    book.rotation.y = REST_Y

    // ---------- Interaction ----------
    let isDragging = false
    let prevX = 0, prevY = 0
    let velX = reduceMotion ? 0 : 0.004, velY = 0
    let idleTimer: number | undefined
    let state: 'closed' | 'opening' | 'open' | 'closing' = 'closed'
    const canvas = renderer.domElement

    function pointerDown(x: number, y: number) {
      if (state !== 'closed') return
      isDragging = true; prevX = x; prevY = y; velX = 0; velY = 0
      hintRef.current?.classList.add('nb3d--hidden')
      canvas.style.cursor = 'grabbing'
      window.clearTimeout(idleTimer)
    }
    function pointerMove(x: number, y: number) {
      if (!isDragging) return
      const dx = x - prevX, dy = y - prevY
      book.rotation.y += dx * 0.008
      book.rotation.x += dy * 0.006
      book.rotation.x = Math.max(-0.9, Math.min(0.9, book.rotation.x))
      velX = dx * 0.0006; velY = dy * 0.0004
      prevX = x; prevY = y
    }
    function pointerUp() {
      if (!isDragging) return
      isDragging = false
      canvas.style.cursor = 'grab'
      if (!reduceMotion) idleTimer = window.setTimeout(() => { velX = 0.004 }, 2200)
    }

    const onMouseDown = (e: MouseEvent) => pointerDown(e.clientX, e.clientY)
    const onMouseMove = (e: MouseEvent) => pointerMove(e.clientX, e.clientY)
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; pointerDown(t.clientX, t.clientY) }
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; pointerMove(t.clientX, t.clientY) }
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', pointerUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: true })
    canvas.addEventListener('touchend', pointerUp)

    // ---------- Open / close tween ----------
    const OPEN_TARGET = -2.55
    const TWEEN_MS = 900
    let tweenStart = 0, tweenFrom = 0, tweenTo = 0, tweening = false
    let byFrom = 0, byTo = 0, bxFrom = 0, bxTo = 0
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

    function startTween(cf: number, ctv: number, yf: number, yt: number, xf: number, xt: number) {
      tweenFrom = cf; tweenTo = ctv; byFrom = yf; byTo = yt; bxFrom = xf; bxTo = xt
      tweenStart = performance.now(); tweening = true
    }
    function openBook() {
      if (state !== 'closed') return
      state = 'opening'; isDragging = false
      hintRef.current?.classList.add('nb3d--hidden')
      openBtnRef.current?.classList.add('nb3d--hidden')
      startTween(coverPivot.rotation.y, OPEN_TARGET, book.rotation.y, 0, book.rotation.x, -0.05)
    }
    function closeBook() {
      if (state !== 'open') return
      state = 'closing'
      overlayRef.current?.classList.remove('nb3d--visible')
      line1Ref.current?.classList.remove('nb3d--write')
      line2Ref.current?.classList.remove('nb3d--write')
      closeBtnRef.current?.classList.remove('nb3d--visible')
      startTween(coverPivot.rotation.y, 0, book.rotation.y, REST_Y, book.rotation.x, REST_X)
    }
    openBtnRef.current?.addEventListener('click', openBook)
    closeBtnRef.current?.addEventListener('click', closeBook)

    function updateTween(now: number) {
      if (!tweening) return
      const t = Math.min(1, (now - tweenStart) / TWEEN_MS)
      const e = easeInOutCubic(t)
      coverPivot.rotation.y = tweenFrom + (tweenTo - tweenFrom) * e
      book.rotation.y = byFrom + (byTo - byFrom) * e
      book.rotation.x = bxFrom + (bxTo - bxFrom) * e
      if (t >= 1) {
        tweening = false
        if (state === 'opening') {
          state = 'open'
          closeBtnRef.current?.classList.add('nb3d--visible')
          if (tagSubRef.current) tagSubRef.current.textContent = 'Every notebook, made to trace'
          window.setTimeout(() => {
            overlayRef.current?.classList.add('nb3d--visible')
            if (!reduceMotion) {
              line1Ref.current?.classList.add('nb3d--write')
              line2Ref.current?.classList.add('nb3d--write')
            }
          }, 150)
        } else if (state === 'closing') {
          state = 'closed'
          openBtnRef.current?.classList.remove('nb3d--hidden')
          hintRef.current?.classList.remove('nb3d--hidden')
          if (tagSubRef.current) tagSubRef.current.textContent = 'Drag to explore'
        }
      }
    }

    // ---------- Animate ----------
    let rafId = 0
    function animate(now: number) {
      rafId = requestAnimationFrame(animate)
      updateTween(now || performance.now())
      if (state === 'closed' && !isDragging) {
        book.rotation.y += velX
        book.rotation.x += velY
        velY *= 0.94
        book.rotation.x *= 0.98
      }
      renderer.render(scene, camera)
    }

    const ro = new ResizeObserver(() => resize())
    ro.observe(stage)
    resize()
    rafId = requestAnimationFrame(animate)

    // ---------- Cleanup ----------
    const openBtn = openBtnRef.current
    const closeBtn = closeBtnRef.current
    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(idleTimer)
      ro.disconnect()
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', pointerUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', pointerUp)
      openBtn?.removeEventListener('click', openBook)
      closeBtn?.removeEventListener('click', closeBook)
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      renderer.dispose()
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [])

  return (
    <div ref={stageRef} className={cn('nb3d', className)}>
      <div className="nb3d__tag">Suvadu<span ref={tagSubRef}>Drag to explore</span></div>
      <button ref={closeBtnRef} type="button" className="nb3d__close" aria-label="Close notebook">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
      <div ref={overlayRef} className="nb3d__overlay">
        <div ref={line1Ref} className="nb3d__line">Make your mark.</div>
        <div ref={line2Ref} className="nb3d__line nb3d__line2">Mark your Suvadu.</div>
        <div className="nb3d__sign">— Suvadu.</div>
      </div>
      <div ref={hintRef} className="nb3d__hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11.5V6a1.5 1.5 0 0 1 3 0v5" /><path d="M12 11.5V4.5a1.5 1.5 0 0 1 3 0v7" /><path d="M15 11.5V6a1.5 1.5 0 0 1 3 0v7" /><path d="M9 12l-1.8-1.8a1.4 1.4 0 0 0-2 2L9 16c1 3 3 5 6 5h1a5 5 0 0 0 5-5v-3.5a1.5 1.5 0 0 0-3 0" /></svg>
        Drag to rotate
      </div>
      <button ref={openBtnRef} type="button" className="nb3d__open">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H10a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5H2Z" /><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H14a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5H22Z" /></svg>
        Open the notebook
      </button>
    </div>
  )
}
