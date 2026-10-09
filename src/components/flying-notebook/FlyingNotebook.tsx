import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { createNotebook, BOOK_H } from './notebookModel'
import { getStages, type StageConfig } from './stageRegistry'
import { cn } from '@/lib/utils'
import './flying-notebook.css'

// ── The Suvadu flying notebook ─────────────────────────────────────────────────────────
// One 3D notebook on a canvas that covers the viewport (and lets every click
// through). It has three ways of being on screen:
//
//   stage   - resting in a slot a page declared with <FlyingNotebookStage>: big, turning
//             slowly, ready to be dragged. Where a stage asks for it, the book
//             swings open and writes a message on its page.
//   dock    - a small companion in the bottom-left corner while you browse, so
//             it never sits on top of the shop.
//   summon  - tapped from the dock (or opened on a stage): it flies to the middle
//             of the screen, opens, and offers a few places to go.
//
// Between stages the book flies. That flight is *scrubbed by scroll position*,
// not timed: it leaves a stage as you scroll away, settles into the dock, and
// takes off again to meet the next stage - in either direction, at any speed.

const FOV = 26
const HEADER_H = 72
const DOCK_MARGIN = { desktop: 26, mobile: 14 }
const DOCK_H = { desktop: 78, mobile: 64 }
/** The glass disc under the docked book, as a multiple of the book's height. */
const PLATE = 1.24
const TAU = Math.PI * 2

const OPEN_SECONDS = 1.7
const CLOSE_SECONDS = 1.15
const WRITE_SECONDS = 2.7

type Message = { lines: readonly [string, string]; sign: string }
const BRAND_MESSAGE: Message = { lines: ['Make your mark.', 'Mark your Suvadu.'], sign: '- Suvadu.' }
const HELLO_MESSAGE: Message = { lines: ['Hello, writer.', 'Where shall we begin?'], sign: '- Your Suvadu.' }

const LINKS = [
  { label: 'Shop collections', to: '/collections' },
  { label: 'Best sellers', to: '/collections?filter=bestseller' },
  { label: 'Special collections', to: '/special-collections' },
]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const damp = (cur: number, target: number, k: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-k * dt))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smoothstep = (t: number) => t * t * (3 - 2 * t)

/** A stage, measured for this frame. */
interface Measured {
  cfg: StageConfig
  id: string
  cx: number
  docTop: number
  docBottom: number
  height: number
  /** Book height when closed / when open - the open spread is wider, so it has
   *  to stand a little smaller to fit the same slot. */
  hClosed: number
  hOpen: number
}

type Phase =
  | { kind: 'dock' }
  | { kind: 'hold'; s: Measured }
  | { kind: 'leave'; s: Measured; u: number }
  | { kind: 'arrive'; s: Measured; u: number }

interface Target {
  x: number
  y: number
  h: number
  rotY: number
  rotX: number
  /** Extra whole turns added mid-flight - identical to 0 at both ends. */
  spin: number
  open: boolean
  /** 1 when the book is in the dock, 0 on a stage - fades the glass disc. */
  dock: number
  phase: Phase
  message: Message
}

function radialTexture(stops: [number, string][]): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  stops.forEach(([o, col]) => grad.addColorStop(o, col))
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

/** A soft four-point glint, drawn white so each sparkle can be tinted. */
function sparkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 30)
  glow.addColorStop(0, 'rgba(255,255,255,0.95)'); glow.addColorStop(0.25, 'rgba(255,255,255,0.45)'); glow.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#fff'
  g.beginPath()
  g.moveTo(32, 3); g.quadraticCurveTo(34, 30, 61, 32); g.quadraticCurveTo(34, 34, 32, 61)
  g.quadraticCurveTo(30, 34, 3, 32); g.quadraticCurveTo(30, 30, 32, 3); g.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

export default function FlyingNotebook({ active }: { active: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const layerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const hitRef = useRef<HTMLButtonElement>(null)
  const penRef = useRef<SVGSVGElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLButtonElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  const summonedRef = useRef(false)
  const [summoned, setSummonedState] = useState(false)
  const [label, setLabel] = useState('Open the Suvadu notebook')
  const apiRef = useRef<{ activate: () => void } | null>(null)

  const setSummoned = useCallback((v: boolean) => {
    summonedRef.current = v
    setSummonedState(v)
  }, [])

  // A new page is a new context: put the book away.
  useEffect(() => { setSummoned(false) }, [pathname, setSummoned])

  useEffect(() => {
    if (summoned) firstLinkRef.current?.focus({ preventScroll: true })
  }, [summoned])

  useEffect(() => {
    const host = hostRef.current
    const layer = layerRef.current
    const hit = hitRef.current
    const pen = penRef.current
    const plate = plateRef.current
    if (!host || !layer || !hit || !pen || !plate) return

    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const phoneMq = window.matchMedia('(max-width: 767px)')

    // ---------- Renderer / scene / camera ----------
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      root.dataset.flyingNotebook = 'off' // no WebGL: the stages keep their stand-ins
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75))
    // Written without conversion, as the prototype's r128 did - see notebookModel.
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.autoClear = false
    const canvas = renderer.domElement
    canvas.className = 'flying-notebook-canvas'
    host.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400)
    const tanHalf = Math.tan((FOV * Math.PI) / 360)

    // Same rig as the prototype's showcase, scaled for r160's physical lights.
    const lit = Math.PI
    scene.add(new THREE.AmbientLight(0xf6efff, 0.58 * lit))
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9aeea, 0.35 * lit))
    const key = new THREE.DirectionalLight(0xfff4e8, 1.05 * lit)
    key.position.set(3.5, 5, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.0005
    key.shadow.radius = 2
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x8a5cd6, 0.42 * lit)
    fill.position.set(-4, 2, -3); scene.add(fill)
    const rim = new THREE.DirectionalLight(0xebdcff, 0.55 * lit)
    rim.position.set(-2, 3, -5); scene.add(rim)

    const model = createNotebook(renderer)
    const book = model.group
    book.rotation.order = 'ZXY' // yaw, then pitch, then roll in screen space
    scene.add(book)

    // A soft shadow below the book, and a lilac halo behind it - together they
    // lift it off the page it is flying over.
    const blobTex = radialTexture([[0, 'rgba(44,26,62,0.55)'], [0.5, 'rgba(44,26,62,0.2)'], [1, 'rgba(44,26,62,0)']])
    const haloTex = radialTexture([[0, 'rgba(214,188,236,0.9)'], [0.45, 'rgba(190,150,230,0.32)'], [1, 'rgba(190,150,230,0)']])
    const planeGeo = new THREE.PlaneGeometry(1, 1)
    const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false })
    const blob = new THREE.Mesh(planeGeo, blobMat)
    blob.scale.set(2.5, 0.62, 1); blob.renderOrder = -2
    const halo = new THREE.Mesh(planeGeo, haloMat)
    halo.scale.set(5.6, 5.6, 1); halo.position.z = -1.5; halo.renderOrder = -3
    scene.add(blob, halo)

    // Sparkle trail, drawn in pixels by its own orthographic camera, under the book.
    const pScene = new THREE.Scene()
    const pCam = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10)
    const sparkTex = sparkTexture()
    const TINTS = [0x7d45ae, 0x9a66c7, 0xc9a8f0, 0xf0a9c8]
    const sparks = Array.from({ length: reduce ? 0 : 46 }, (_, i) => {
      const mat = new THREE.SpriteMaterial({ map: sparkTex, color: TINTS[i % TINTS.length], transparent: true, depthTest: false, depthWrite: false })
      const sprite = new THREE.Sprite(mat)
      sprite.visible = false
      pScene.add(sprite)
      return { sprite, mat, life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, size: 10, spin: 0 }
    })
    let emitAcc = 0

    // ---------- Sizing ----------
    let vw = 1, vh = 1
    function resize() {
      vw = host!.clientWidth || window.innerWidth
      vh = host!.clientHeight || window.innerHeight
      renderer.setSize(vw, vh, false)
      camera.aspect = vw / vh
      pCam.right = vw; pCam.top = vh
      pCam.updateProjectionMatrix()
      // The links panel sits outside the canvas layer, so the variable lives on <html>.
      root.style.setProperty('--flying-notebook-summon-h', `${summonHeight()}px`)
    }
    const isPhone = () => phoneMq.matches
    const dockH = () => (isPhone() ? DOCK_H.mobile : DOCK_H.desktop)
    function dockPos() {
      const m = isPhone() ? DOCK_MARGIN.mobile : DOCK_MARGIN.desktop
      const h = dockH()
      const r = (h * PLATE) / 2
      return { x: m + r, y: vh - m - r }
    }
    /** Closed-book height that lets the open spread (≈1.5× as wide) fit the screen. */
    function summonHeight() {
      return Math.round(clamp(Math.min(vh * 0.5, (vw * 0.88) / 1.5), 150, 470))
    }

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // ---------- Engine state ----------
    // The smoothed pose actually drawn. Targets are recomputed every frame from
    // scroll position; this chases them so the book has weight.
    const cur = { x: 0, y: 0, h: dockH(), rotY: 0.45, rotX: -0.06 }
    let primed = false
    let o = 0 // how open, 0…1
    let writeT = 0 // handwriting progress, 0…1
    let peek = 0 // cover lifted slightly to say "I open"
    let dockAlpha = 0
    let dockMix = 0 // how much of the dock's glass disc is showing
    let scrollY = window.scrollY
    let lastScrollY = scrollY
    let scrollVel = 0
    let lastT = performance.now() / 1000
    let vx = 0, vy = 0 // book velocity on screen, px/s
    let prevX = 0, prevY = 0
    let slowUntil = 0 // summon flights are timed, so they ease more gently
    let spinAnim: { t0: number; dur: number } | null = null
    let summonScroll = 0
    let manual: { id: string; open: boolean } | null = null
    let message: Message = BRAND_MESSAGE
    let messageKey = 'brand'
    let dockedFor = 0
    let hinted = false
    try { hinted = sessionStorage.getItem('suvadu-flying-notebook-hinted') === '1' } catch { /* private mode */ }
    let hintUntil = 0
    let hovering = false
    let frameN = 0
    let readyShown = false
    let lastMode = ''
    let lastLabel = ''
    let currentPhase: Phase = { kind: 'dock' }
    let wantsOpen = false

    // drag
    let dragging = false
    let dragMoved = 0
    let dragX = 0, dragY = 0
    let dragRotY = 0, dragRotX = 0
    let dragVelY = 0
    let releasedAt = 0

    model.setMessage(message.lines, message.sign)

    // ---------- Stages ----------
    function measureStages(): Measured[] {
      const out: Measured[] = []
      for (const entry of getStages()) {
        const r = entry.el.getBoundingClientRect()
        if (r.width < 40 || r.height < 40) continue // display:none, or not laid out
        const cfg = entry.config
        const fit = cfg.fit ?? 0.9
        // A pinned stage can be many screens tall; the book only has to fit the
        // part of it that is on screen at once.
        const usable = cfg.pin ? Math.min(r.height, vh - HEADER_H - 56) : r.height
        out.push({
          cfg,
          id: entry.id,
          cx: r.left + r.width / 2,
          docTop: r.top + scrollY,
          docBottom: r.bottom + scrollY,
          height: r.height,
          hClosed: Math.min(usable * fit, (r.width * fit) / 0.8),
          hOpen: Math.min(usable * fit, (r.width * fit) / 1.5),
        })
      }
      return out.sort((a, b) => a.docTop - b.docTop)
    }

    /** Where the book sits on a stage at scroll position `sy`. Pinned stages hold
     *  the middle of the screen until the stage runs out, like `position: sticky`. */
    function holdPos(s: Measured, sy: number, h: number) {
      const top = s.docTop - sy
      const bottom = s.docBottom - sy
      if (!s.cfg.pin) return { x: s.cx, y: (top + bottom) / 2 }
      const m = 14
      const lo = top + h / 2 + m
      const hi = bottom - h / 2 - m
      const want = (HEADER_H + vh) / 2
      return { x: s.cx, y: lo > hi ? (top + bottom) / 2 : clamp(want, lo, hi) }
    }

    const restH = (s: Measured) => (s.cfg.open ? s.hOpen : s.hClosed)
    /** Scroll position at which the book lets go of a stage. Never before the
     *  visitor has actually scrolled a little - a stage that starts life near the
     *  bottom of a short screen would otherwise be mid-flight at scroll 0. */
    const leaveScroll = (s: Measured) => Math.max(s.docBottom - (s.cfg.leaveAt ?? 0.5) * vh, 80)
    /** Scroll position at which the book is settled on a stage - once the book
     *  itself, not just the stage's edge, is comfortably on screen. */
    const arriveScroll = (s: Measured) =>
      s.docTop - (s.cfg.arriveAt !== undefined ? s.cfg.arriveAt * vh : 0.94 * vh - restH(s) - 28)

    function resolvePhase(st: Measured[], sy: number): Phase {
      const n = st.length
      if (n === 0) return { kind: 'dock' }
      const dep = st.map(leaveScroll)
      const arr = st.map(arriveScroll)
      // A first stage that is already on screen at scroll 0 has nothing to fly in
      // from; one below the fold gets a proper arrival like any other.
      const startsOnScreen = arr[0] <= 0
      const L = st.map(() => 0.62 * vh)
      const A = st.map(() => 0.7 * vh)
      // Two stages close together: squeeze the flights so they still fit.
      for (let i = 0; i < n - 1; i++) {
        const gap = arr[i + 1] - dep[i]
        const need = L[i] + A[i + 1]
        if (gap < need) {
          const f = Math.max(gap, 48) / need
          L[i] *= f; A[i + 1] *= f
        }
      }
      for (let i = 0; i < n; i++) {
        const s = st[i]
        const holdFrom = i === 0 && startsOnScreen ? -Infinity : arr[i]
        if (sy >= holdFrom && sy < dep[i]) return { kind: 'hold', s }
        if (sy >= dep[i] && sy < dep[i] + L[i]) return { kind: 'leave', s, u: (sy - dep[i]) / L[i] }
        if ((i > 0 || !startsOnScreen) && sy >= arr[i] - A[i] && sy < arr[i]) return { kind: 'arrive', s, u: (sy - (arr[i] - A[i])) / A[i] }
      }
      return { kind: 'dock' }
    }

    function stageRot(s: Measured, t: number) {
      const sway = reduce ? 0 : Math.sin(t * 0.6) * 0.42
      return (s.cfg.rotY ?? 0.5) + sway
    }

    function computeTarget(st: Measured[], t: number): Target {
      const dock = dockPos()
      const dh = dockH()
      const dockRot = 0.5 + (reduce ? 0 : Math.sin(t * 0.7) * 0.2)

      if (summonedRef.current) {
        const h = summonHeight()
        return { x: vw / 2, y: vh / 2 - 26, h, rotY: -0.17 + (reduce ? 0 : Math.sin(t * 0.8) * 0.04), rotX: -0.1, spin: 0, open: true, dock: 0, phase: { kind: 'dock' }, message: HELLO_MESSAGE }
      }

      let phase: Phase
      if (reduce) {
        // No flying for reduced motion: stand on whichever stage is in view, else dock.
        const inView = st.find((s) => {
          const top = s.docTop - scrollY
          return top < vh * 0.75 && top + s.height > vh * 0.25
        })
        phase = inView ? { kind: 'hold', s: inView } : { kind: 'dock' }
      } else {
        phase = resolvePhase(st, scrollY)
      }

      if (phase.kind === 'dock') {
        return { x: dock.x, y: dock.y, h: dh, rotY: dockRot, rotX: -0.06, spin: 0, open: false, dock: 1, phase, message: BRAND_MESSAGE }
      }

      const s = phase.s
      const sMessage = s.cfg.message ?? BRAND_MESSAGE
      if (phase.kind === 'hold') {
        const oe = smoothstep(o)
        const h = lerp(s.hClosed, s.hOpen, oe)
        const p = holdPos(s, scrollY, h)
        const manualHere = manual && manual.id === s.id ? manual.open : undefined
        const open = manualHere ?? !!s.cfg.open
        const closedRot = stageRot(s, t)
        // Open, the spread settles to a gentle three-quarter lean - flat-on reads as
        // a diagram, this reads as an object - and breathes a little.
        const openRot = -0.17 + (reduce ? 0 : Math.sin(t * 0.8) * 0.04)
        return { x: p.x, y: p.y, h, rotY: lerp(closedRot, openRot, smoothstep(clamp(o / 0.45, 0, 1))), rotX: lerp(-0.06, -0.1, oe), spin: 0, open, dock: 0, phase, message: sMessage }
      }

      // Flying between a stage and the dock.
      const e = easeInOut(phase.u)
      const leaving = phase.kind === 'leave'
      // One end of the flight is the dock; the other is where the stage's hold
      // begins or ends, worked out for that scroll position rather than "now".
      const end = holdPos(s, leaving ? leaveScroll(s) : arriveScroll(s), s.hClosed)
      const from = leaving ? end : dock
      const to = leaving ? dock : end
      const dx = to.x - from.x, dy = to.y - from.y
      const len = Math.hypot(dx, dy) || 1
      // Bow the path downwards, away from the copy, then sweep in.
      let px = -dy / len, py = dx / len
      if (py < 0) { px = -px; py = -py }
      const bow = Math.min(len * 0.16, 130) * Math.sin(Math.PI * e)
      const hFrom = leaving ? s.hClosed : dh
      const hTo = leaving ? dh : s.hClosed
      const rotFrom = leaving ? stageRot(s, t) : dockRot
      const rotTo = leaving ? dockRot : stageRot(s, t)
      return {
        x: lerp(from.x, to.x, e) + px * bow,
        y: lerp(from.y, to.y, e) + py * bow,
        h: lerp(hFrom, hTo, e) * (1 - 0.16 * Math.sin(Math.PI * e)),
        rotY: lerp(rotFrom, rotTo, e),
        rotX: -0.06,
        spin: TAU * e,
        // It starts opening on the approach, so it is already swinging as it lands.
        open: !leaving && phase.u > 0.55 && !!s.cfg.open,
        dock: leaving ? e : 1 - e,
        phase,
        message: sMessage,
      }
    }

    // ---------- Interaction ----------
    function hitAction() {
      // A drag that ended over the button is a turn of the book, not a tap.
      if (dragMoved > 6) { dragMoved = 0; return }
      if (summonedRef.current) { closeSummon(); return }
      const p = currentPhase
      if (p.kind === 'hold') {
        manual = { id: p.s.id, open: !wantsOpen }
      } else if (p.kind === 'dock' && dockAlpha > 0.5) {
        openSummon()
      }
    }
    apiRef.current = { activate: hitAction }

    function openSummon() {
      summonScroll = window.scrollY
      slowUntil = performance.now() / 1000 + 1.6
      spinAnim = reduce ? null : { t0: performance.now() / 1000, dur: 1.15 }
      setSummoned(true)
    }
    function closeSummon() {
      slowUntil = performance.now() / 1000 + 1.6
      spinAnim = reduce ? null : { t0: performance.now() / 1000, dur: 1.0 }
      setSummoned(false)
    }

    const canDrag = () => !summonedRef.current && o < 0.05 && (currentPhase.kind === 'hold' || currentPhase.kind === 'dock')
    const onDown = (e: PointerEvent) => {
      if (!canDrag()) return
      dragging = true; dragMoved = 0; dragX = e.clientX; dragY = e.clientY; dragVelY = 0
      try { hit.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - dragX, dy = e.clientY - dragY
      dragX = e.clientX; dragY = e.clientY
      dragMoved += Math.abs(dx) + Math.abs(dy)
      dragRotY += dx * 0.011
      dragRotX = clamp(dragRotX + dy * 0.007, -0.7, 0.7)
      dragVelY = dx * 0.011 * 60
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      releasedAt = performance.now() / 1000
    }
    const onEnter = () => { hovering = true }
    const onLeave = () => { hovering = false }
    hit.addEventListener('pointerdown', onDown)
    hit.addEventListener('pointermove', onMove)
    hit.addEventListener('pointerup', onUp)
    hit.addEventListener('pointercancel', onUp)
    hit.addEventListener('pointerenter', onEnter)
    hit.addEventListener('pointerleave', onLeave)
    hit.addEventListener('focus', onEnter)
    hit.addEventListener('blur', onLeave)

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (summonedRef.current) closeSummon()
      else if (manual && currentPhase.kind === 'hold') manual = { id: currentPhase.s.id, open: false }
    }
    window.addEventListener('keydown', onKey)

    const onContextLost = (e: Event) => { e.preventDefault(); root.dataset.flyingNotebook = 'off'; cancelAnimationFrame(raf) }
    canvas.addEventListener('webglcontextlost', onContextLost)

    // ---------- Sparkles ----------
    function spawnSpark(x: number, y: number, h: number, dirX: number, dirY: number) {
      const sp = sparks.find((s) => s.life <= 0)
      if (!sp) return
      sp.life = 0.0001
      sp.max = 0.8 + Math.random() * 0.9
      sp.x = x + (Math.random() - 0.5) * h * 0.7
      sp.y = y + (Math.random() - 0.5) * h * 0.8
      sp.vx = -dirX * 0.12 + (Math.random() - 0.5) * 50
      sp.vy = -dirY * 0.12 + (Math.random() - 0.5) * 50 - 14
      sp.size = (7 + Math.random() * 12) * clamp(h / 200, 0.7, 1.5)
      sp.spin = (Math.random() - 0.5) * 3
      sp.mat.rotation = Math.random() * TAU
      sp.sprite.visible = true
    }
    function updateSparks(dt: number) {
      for (const sp of sparks) {
        if (sp.life <= 0) continue
        sp.life += dt
        const k = sp.life / sp.max
        if (k >= 1) { sp.life = 0; sp.sprite.visible = false; continue }
        sp.x += sp.vx * dt; sp.y += sp.vy * dt
        sp.vx *= 0.985; sp.vy *= 0.985
        sp.mat.rotation += sp.spin * dt
        const a = Math.sin(Math.PI * k)
        sp.mat.opacity = a * 0.95
        const sc = sp.size * (0.45 + 0.85 * a)
        sp.sprite.scale.set(sc, sc, 1)
        sp.sprite.position.set(sp.x, vh - sp.y, 0)
      }
    }

    // ---------- Frame ----------
    const nibVec = new THREE.Vector3()
    // Style writes are only worth making when the value moved; the hit area and
    // glass disc hold still for most of a visit.
    const lastStyle = new WeakMap<HTMLElement, Record<string, string>>()
    function setStyle(el: HTMLElement, prop: 'width' | 'height' | 'transform' | 'opacity', value: string) {
      let cache = lastStyle.get(el)
      if (!cache) { cache = {}; lastStyle.set(el, cache) }
      if (cache[prop] === value) return
      cache[prop] = value
      el.style[prop] = value
    }
    let raf = 0
    function frame(nowMs: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      step(nowMs)
    }
    function step(nowMs: number) {
      const now = nowMs / 1000
      const dt = clamp(now - lastT, 0.001, 0.05)
      lastT = now
      frameN++

      if (!activeRef.current) {
        // Off-route (cart, checkout…): park the book out of sight and stop drawing.
        if (dockAlpha > 0 || lastMode !== 'flying') {
          dockAlpha = 0
          setStyle(layer!, 'opacity', '0')
          setStyle(plate!, 'opacity', '0')
          lastMode = 'flying'
          hit!.dataset.mode = 'flying'
          hit!.tabIndex = -1
          hit!.classList.remove('is-hinting')
        }
        return
      }

      scrollY = Math.max(0, window.scrollY)
      scrollVel = damp(scrollVel, (scrollY - lastScrollY) / dt, 14, dt)
      lastScrollY = scrollY
      if (summonedRef.current && Math.abs(scrollY - summonScroll) > 160) closeSummon()

      const stages = measureStages()
      const tgt = computeTarget(stages, now)
      currentPhase = tgt.phase
      const summonedNow = summonedRef.current

      // Visibility: with a stage on the page the book is always around; on stage-less
      // pages it appears once you start scrolling, so it never competes with a page title.
      const wantAlpha = summonedNow || stages.length > 0 || scrollY > 140 ? 1 : 0
      dockAlpha = reduce ? wantAlpha : damp(dockAlpha, wantAlpha, 7, dt)
      if (Math.abs(dockAlpha - wantAlpha) < 0.01) dockAlpha = wantAlpha

      // Open / close
      if (manual && !(currentPhase.kind === 'hold' && currentPhase.s.id === manual.id)) manual = null
      wantsOpen = tgt.open
      if (wantsOpen) {
        const key = summonedNow ? 'hello' : stages.length && tgt.phase.kind !== 'dock' ? tgt.phase.s.id : 'brand'
        if (key !== messageKey && o < 0.02) {
          messageKey = key
          message = tgt.message
          model.setMessage(message.lines, message.sign)
        }
      }
      if (reduce) o = wantsOpen ? 1 : 0
      else o = clamp(o + (wantsOpen ? dt / OPEN_SECONDS : -dt / CLOSE_SECONDS), 0, 1)
      if (reduce) writeT = wantsOpen ? 1 : 0
      else if (wantsOpen && o > 0.985) writeT = clamp(writeT + dt / WRITE_SECONDS, 0, 1)
      else if (!wantsOpen || o < 0.9) writeT = clamp(writeT - dt / 0.45, 0, 1)

      // Pose: chase the target. Summons are timed, so they ease gently; scroll
      // flights follow the page closely.
      const slow = now < slowUntil
      const kPos = reduce ? 1000 : slow ? 4.2 : 17
      const kRot = reduce ? 1000 : slow ? 4 : 9
      if (!primed) {
        cur.x = tgt.x; cur.y = tgt.y; cur.h = tgt.h; cur.rotY = tgt.rotY; cur.rotX = tgt.rotX
        prevX = tgt.x; prevY = tgt.y
        primed = true
      } else {
        cur.x = damp(cur.x, tgt.x, kPos, dt)
        cur.y = damp(cur.y, tgt.y, kPos, dt)
        cur.h = damp(cur.h, tgt.h, reduce ? 1000 : slow ? 4.5 : 12, dt)
        cur.rotY = damp(cur.rotY, tgt.rotY, kRot, dt)
        cur.rotX = damp(cur.rotX, tgt.rotX, kRot, dt)
      }
      dockMix = reduce ? tgt.dock : damp(dockMix, tgt.dock, 12, dt)
      vx = damp(vx, (cur.x - prevX) / dt, 18, dt)
      vy = damp(vy, (cur.y - prevY) / dt, 18, dt)
      prevX = cur.x; prevY = cur.y

      // Turns added by a summon flight.
      let spin = tgt.spin
      if (spinAnim) {
        const k = (now - spinAnim.t0) / spinAnim.dur
        if (k >= 1) spinAnim = null
        else spin += TAU * easeInOut(clamp(k, 0, 1))
      }

      // Drag offsets: momentum, then ease back to the nearest whole turn.
      if (!dragging) {
        dragRotY += dragVelY * dt
        dragVelY *= Math.exp(-3 * dt)
        if (now - releasedAt > 1.6 || o > 0.05) {
          dragRotY = damp(dragRotY, Math.round(dragRotY / TAU) * TAU, o > 0.05 ? 8 : 1.1, dt)
          dragRotX = damp(dragRotX, 0, o > 0.05 ? 8 : 1.1, dt)
        }
      }

      // Hover / first-visit hint: lift the cover a touch, like a bookmark peeking out.
      const atDock = currentPhase.kind === 'dock' && !summonedNow && dockAlpha > 0.9
      dockedFor = atDock ? dockedFor + dt : 0
      if (atDock && !hinted && dockedFor > 1.4) {
        hinted = true
        hintUntil = now + 5
        try { sessionStorage.setItem('suvadu-flying-notebook-hinted', '1') } catch { /* private mode */ }
      }
      const hinting = now < hintUntil
      hit!.classList.toggle('is-hinting', hinting && atDock)
      const peekTarget = o > 0.02 || reduce ? 0 : hovering ? 0.11 : hinting ? 0.05 + 0.05 * Math.sin(now * 3.2) : 0
      peek = damp(peek, peekTarget, 8, dt)

      // ---- Draw ----
      const idleBook = !dragging && !slow && !spinAnim && Math.abs(vx) + Math.abs(vy) < 6 && Math.abs(scrollVel) < 4 && o === (wantsOpen ? 1 : 0) && (writeT === 0 || writeT === 1)
      const anySparks = sparks.some((s) => s.life > 0)
      // A book at rest only sways, so half the frames are plenty.
      const skipDraw = idleBook && !anySparks && !hovering && (frameN & 1) === 1
      if (!skipDraw && dockAlpha > 0.004) {
        const bob = reduce ? 0 : Math.sin(now * 1.5) * cur.h * 0.012
        const rollTarget = reduce ? 0 : clamp(vx / 2600, -0.4, 0.4)
        const pitchTarget = reduce ? 0 : clamp(vy / 5200, -0.2, 0.2)
        const px = cur.x, py = cur.y + bob

        camera.position.set(0, 0, vh / (2 * tanHalf * (cur.h / BOOK_H)))
        camera.setViewOffset(vw, vh, vw / 2 - px, vh / 2 - py, vw, vh)
        camera.updateMatrixWorld()

        model.setOpen(o + peek)
        const oe = smoothstep(o)
        book.rotation.set(
          cur.rotX + dragRotX + pitchTarget * (1 - oe),
          cur.rotY + dragRotY * (1 - oe) + spin,
          rollTarget * (1 - oe),
        )
        blob.position.set(book.position.x, -BOOK_H * 0.66 - 0.04 * Math.sin(now * 1.5), -0.55)
        blobMat.opacity = (0.5 + 0.2 * oe) * (tgt.phase.kind === 'dock' && !summonedNow ? 0.8 : 1)
        halo.position.x = book.position.x
        haloMat.opacity = summonedNow ? 0.95 : lerp(tgt.phase.kind === 'hold' ? 0.7 : 0.45, 0.22, dockMix)

        // Sparkles ride along while the book is moving relative to the page.
        if (!reduce) {
          const rvx = vx, rvy = vy + scrollVel
          const speed = Math.hypot(rvx, rvy)
          if (speed > 140 && dockAlpha > 0.5) {
            emitAcc += clamp((speed - 140) / 22, 0, 46) * dt
            while (emitAcc >= 1) { emitAcc -= 1; spawnSpark(px, py, cur.h, rvx, rvy) }
          }
          updateSparks(dt)
        }

        // Handwriting and the nib that draws it.
        const nibLocal = model.setInk(writeT)
        let penOn = false
        if (nibLocal && o > 0.97) {
          book.updateMatrixWorld(true)
          nibVec.copy(nibLocal)
          book.localToWorld(nibVec)
          nibVec.project(camera)
          const sx = (nibVec.x * 0.5 + 0.5) * vw
          const sy = (-nibVec.y * 0.5 + 0.5) * vh
          pen!.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) rotate(28deg) scale(${clamp(cur.h / 380, 0.6, 1.25).toFixed(2)})`
          penOn = true
        }
        pen!.classList.toggle('is-on', penOn)

        renderer.clear()
        renderer.render(pScene, pCam)
        renderer.clearDepth()
        renderer.render(scene, camera)

        if (!readyShown) {
          readyShown = true
          root.dataset.flyingNotebook = 'ready'
        }
      }
      setStyle(layer!, 'opacity', dockAlpha.toFixed(3))

      // ---- Hit area ----
      const interactive = (tgt.phase.kind === 'hold' && tgt.phase.s.cfg.interactive !== false) || (atDock && dockAlpha > 0.9) || summonedNow
      const mode = summonedNow ? 'summon' : !interactive ? 'flying' : tgt.phase.kind === 'hold' ? 'stage' : 'dock'
      if (mode !== lastMode) {
        lastMode = mode
        hit!.dataset.mode = mode
        // Out of the tab order while it is mid-flight and can't be activated.
        hit!.tabIndex = mode === 'flying' ? -1 : 0
      }
      const openNow = o > 0.5
      const openAttr = openNow ? 'true' : 'false'
      if (hit!.dataset.open !== openAttr) hit!.dataset.open = openAttr
      const nextLabel = mode === 'dock' ? 'Open the Suvadu notebook' : openNow ? 'Close the notebook' : 'Open the notebook'
      if (nextLabel !== lastLabel) { lastLabel = nextLabel; setLabel(nextLabel) }
      const spread = lerp(0.84, 1.52, smoothstep(o))
      // The glass disc under the docked book - also the dock's tap target.
      const plateD = cur.h * PLATE
      setStyle(plate!, 'width', `${plateD.toFixed(1)}px`)
      setStyle(plate!, 'height', `${plateD.toFixed(1)}px`)
      setStyle(plate!, 'transform', `translate3d(${(cur.x - plateD / 2).toFixed(1)}px, ${(cur.y - plateD / 2).toFixed(1)}px, 0)`)
      setStyle(plate!, 'opacity', dockMix.toFixed(3))
      const hw = Math.max(64, lerp(cur.h * spread, plateD, dockMix))
      const hh = Math.max(64, lerp(cur.h * 1.02, plateD, dockMix))
      setStyle(hit!, 'width', `${hw.toFixed(0)}px`)
      setStyle(hit!, 'height', `${hh.toFixed(0)}px`)
      setStyle(hit!, 'transform', `translate3d(${(cur.x - hw / 2).toFixed(1)}px, ${(cur.y - hh / 2).toFixed(1)}px, 0)`)
    }
    raf = requestAnimationFrame(frame)

    // The cover is set in type - redraw it once the webfonts resolve.
    document.fonts?.load('600 96px Caveat').catch(() => undefined)
    document.fonts?.ready.then(() => model.redrawArt())

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      hit.removeEventListener('pointerdown', onDown)
      hit.removeEventListener('pointermove', onMove)
      hit.removeEventListener('pointerup', onUp)
      hit.removeEventListener('pointercancel', onUp)
      hit.removeEventListener('pointerenter', onEnter)
      hit.removeEventListener('pointerleave', onLeave)
      hit.removeEventListener('focus', onEnter)
      hit.removeEventListener('blur', onLeave)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      apiRef.current = null
      model.dispose()
      planeGeo.dispose()
      ;[blobMat, haloMat].forEach((m) => m.dispose())
      ;[blobTex, haloTex, sparkTex].forEach((t) => t.dispose())
      sparks.forEach((s) => s.mat.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
      delete root.dataset.flyingNotebook
      root.style.removeProperty('--flying-notebook-summon-h')
    }
  }, [setSummoned])

  const go = (to: string) => {
    setSummoned(false)
    navigate(to)
  }

  return (
    <>
      <div className={cn('flying-notebook-scrim', summoned && 'is-on')} onClick={() => setSummoned(false)} aria-hidden />
      <div ref={layerRef} className={cn('flying-notebook-layer', summoned && 'is-summoned')} aria-hidden>
        <div ref={plateRef} className="flying-notebook-plate" />
        <div ref={hostRef} className="flying-notebook-host" />
        {/* The nib that draws the handwriting, riding the point the engine projects. */}
        <svg ref={penRef} className="flying-notebook-pen" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="flyingNotebookPenBody" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#2C1A3E" />
              <stop offset="55%" stopColor="#4E2675" />
              <stop offset="100%" stopColor="#7D45AE" />
            </linearGradient>
          </defs>
          <path d="M3 21l3.2-1 11-11a2 2 0 0 0-3.2-3.2l-11 11L2 20l1 1z" fill="url(#flyingNotebookPenBody)" stroke="#2C1A3E" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M14.5 4.5l3.2 3.2" stroke="#EADDF6" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>

      <button
        ref={hitRef}
        type="button"
        className="flying-notebook-hit"
        data-mode="flying"
        aria-label={label}
        onClick={() => apiRef.current?.activate()}
      >
        <span className="flying-notebook-tip" aria-hidden>
          <span className="flying-notebook-tip__dot" />
          Tap me - I open
        </span>
      </button>

      <div className={cn('flying-notebook-panel', summoned && 'is-on')} role="dialog" aria-label="Suvadu notebook" aria-hidden={!summoned}>
        <p className="flying-notebook-panel__title">Where shall we go?</p>
        <div className="flying-notebook-panel__links">
          {LINKS.map((l, i) => (
            <button
              key={l.to}
              ref={i === 0 ? firstLinkRef : undefined}
              type="button"
              tabIndex={summoned ? 0 : -1}
              className="flying-notebook-panel__link"
              onClick={() => go(l.to)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={cn('flying-notebook-close', summoned && 'is-on')}
        aria-label="Close the notebook"
        tabIndex={summoned ? 0 : -1}
        onClick={() => setSummoned(false)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </>
  )
}
