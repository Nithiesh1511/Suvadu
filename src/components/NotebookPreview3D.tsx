import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import wordmark from '@/assets/suvadu-logo.jpg'

// ── 3D notebook preview ──────────────────────────────────────────────────────
// A draggable, openable 3D notebook (ported from the client's Three.js prototype)
// wrapped as a reusable React component. Lazy-load it (see usage) so three.js
// stays out of the initial bundle. All WebGL resources are disposed on unmount.
//
// Opening runs a two-beat sequence: the cover swings clear, then the blank
// flyleaf flips past it, and a pen writes the two lines onto the page beneath.

const PURPLE = '#613092'
const PLUM = '#2C1A3E'
const PAGE = '#FCFAFF'
const LILAC = '#F3E8FF'
const ROYAL_700 = '#4E2675'
const ROYAL_400 = '#9A66C7'
const ROYAL_200 = '#D6BCEC'
const INK_DEEP = '#1E1130'

// Panel opacity — these fade the boards themselves (cover / flyleaf / page
// block), not the artwork printed on them. 1 = fully solid.
const COVER_OPACITY = 0.94
const PAGE_OPACITY = 0.97
const INSIDE_OPACITY = 0.92

// ── Matching the prototype's colour pipeline ─────────────────────────────────
// The prototype runs three r128, whose defaults are the pre-colour-management
// ones: canvas textures are sampled raw, lighting is done on those sRGB values,
// and the result is written to the framebuffer unconverted. r160 defaults to
// full colour management instead, which renders the same scene as a muddy
// near-black. Opting out globally is what reproduces the prototype's purple.
THREE.ColorManagement.enabled = false

// r128 also applied an "artist-friendly" ×π to every light's intensity; r155
// dropped it. The prototype's intensities were dialled in against that, so scale
// them here rather than reaching for the deprecated `useLegacyLights` flag,
// which is gone in newer three.
const LEGACY_LIGHT_SCALE = Math.PI

/** One step of the open / close choreography, run off the render loop so a
 *  single rAF drives everything and cleanup stays a matter of dropping refs. */
type Step =
  | { kind: 'tween'; ms: number; apply: (eased: number) => void }
  | { kind: 'wait'; ms: number }
  | { kind: 'do'; fn: () => void }

export default function NotebookPreview3D({
  className,
  variant = 'card',
  onOpenChange,
}: {
  className?: string
  /** 'card' keeps the original fixed framing. 'showcase' fills a full-width
   *  banner: the camera auto-fits the notebook to the container, pushes it clear
   *  of the copy column, and reserves a strip at the bottom for the controls. */
  variant?: 'card' | 'showcase'
  /** Fired when the cover starts opening / finishes closing, so a surrounding
   *  banner can give the notebook the floor while it's open. */
  onOpenChange?: (open: boolean) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const openBtnRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tagSubRef = useRef<HTMLSpanElement>(null)
  const line1Ref = useRef<HTMLDivElement>(null)
  const line2Ref = useRef<HTMLDivElement>(null)
  const measure1Ref = useRef<HTMLDivElement>(null)
  const measure2Ref = useRef<HTMLDivElement>(null)
  const signRef = useRef<HTMLDivElement>(null)
  const penRef = useRef<SVGSVGElement>(null)
  // Held in a ref so the WebGL effect never re-runs when the parent re-renders
  // with a new callback identity.
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let disposed = false

    // ---------- Renderer / Scene / Camera ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // Write linear-to-nothing, as r128 did — see LEGACY_LIGHT_SCALE above.
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
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
      // A showcase banner is sized by its container, not a fixed ratio, so re-fit
      // the camera on every resize instead of trusting one hard-coded distance.
      stageH = h
      measureControls()
      zTarget = fitZ(state === 'open' || state === 'opening')
      if (!running) camera.position.z = zTarget
      applyOffsets()
      // The handwriting is sized in pixels off a viewport-relative font size, so
      // a resize while the book sits open has to re-measure it.
      if (state === 'open' && !running) settleWriting()
    }
    let stageH = 1

    // ---------- Lighting ----------
    // Tuned on the large showcase; the small card carries a touch less so the
    // pages don't blow out at that size.
    const lit = (variant === 'showcase' ? 1 : 0.95) * LEGACY_LIGHT_SCALE
    scene.add(new THREE.AmbientLight(0xf6efff, 0.58 * lit))
    // A lilac bounce from below, so the plum cover never goes muddy in shadow.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9aeea, 0.35 * lit))
    const key = new THREE.DirectionalLight(0xfff4e8, 1.05 * lit)
    key.position.set(3.5, 5, 4)
    key.castShadow = true
    // A showcase renders the book much larger, so soft-shadow stair-stepping
    // shows at 1024 — give it a finer map and a tighter bias.
    const shadowRes = variant === 'showcase' ? 2048 : 1024
    key.shadow.mapSize.set(shadowRes, shadowRes)
    key.shadow.bias = -0.0005
    key.shadow.radius = 2
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x8a5cd6, 0.42 * lit)
    fill.position.set(-4, 2, -3); scene.add(fill)
    const rim = new THREE.DirectionalLight(0xebdcff, 0.55 * lit)
    rim.position.set(-2, 3, -5); scene.add(rim)

    // ---------- Ground shadow ----------
    const groundGeo = new THREE.PlaneGeometry(12, 12)
    const groundMat = new THREE.ShadowMaterial({ color: 0x2c1a3e, opacity: variant === 'showcase' ? 0.26 : 0.22 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.62
    ground.receiveShadow = true
    scene.add(ground)

    // ---------- Textures (canvas-drawn) ----------
    const textures: THREE.Texture[] = []
    /** A texture backed by a canvas we can redraw — once the webfonts land and
     *  again once the wordmark has been keyed to white ink. */
    type Redrawable = { tex: THREE.CanvasTexture; redraw: () => void }
    function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void): Redrawable {
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d')!
      draw(ctx, w, h)
      const tex = new THREE.CanvasTexture(c)
      // Left unconverted on purpose — the prototype's r128 sampled canvas
      // colours raw, and the palette was tuned against that.
      tex.colorSpace = THREE.NoColorSpace
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      textures.push(tex)
      return {
        tex,
        redraw() {
          ctx.clearRect(0, 0, w, h)
          draw(ctx, w, h)
          tex.needsUpdate = true
        },
      }
    }

    function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    // The wordmark art is purple-on-white JPG, so it can't be stamped straight
    // onto a plum cover. Key it: alpha comes from the inverse of each pixel's
    // luminance, so the paper drops out and the stroke survives — in white ink.
    let logoInk: HTMLCanvasElement | null = null
    function keyToWhiteInk(img: HTMLImageElement): HTMLCanvasElement | null {
      const w = 800
      const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w))
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      try {
        const data = ctx.getImageData(0, 0, w, h)
        const px = data.data
        for (let i = 0; i < px.length; i += 4) {
          const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255
          // A steep ramp rather than a hard threshold: the stroke itself lands
          // fully opaque (so it reads as the prototype's white ink, not a grey
          // wash), while the antialiased edges stay smooth and JPEG noise in the
          // paper still clears completely.
          const a = Math.max(0, Math.min(1, (0.93 - lum) / 0.2))
          px[i] = px[i + 1] = px[i + 2] = 255
          px[i + 3] = Math.round(a * 255)
        }
        ctx.putImageData(data, 0, 0)
        return c
      } catch {
        return null // tainted canvas — the serif fallback below carries the cover
      }
    }

    function drawFrontCover(ctx: CanvasRenderingContext2D, W: number, H: number) {
      // Deep plum base with a diagonal royal wash — reads as dyed cloth rather
      // than flat paint.
      const base = ctx.createLinearGradient(0, 0, W * 0.9, H)
      base.addColorStop(0, ROYAL_700); base.addColorStop(0.45, PLUM); base.addColorStop(1, INK_DEEP)
      ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)

      // Soft glows on three anchor points.
      ctx.save()
      const glows: [number, number, number, string][] = [
        [0.86, 0.06, 340, '154,102,199'],
        [0.92, 0.42, 230, '97,48,146'],
        [0.02, 0.92, 210, '214,188,236'],
      ]
      const alphas = [0.4, 0.3, 0.2]
      glows.forEach(([fx, fy, r, rgb], i) => {
        const x = W * fx, y = H * fy
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(${rgb},${alphas[i]})`); g.addColorStop(1, `rgba(${rgb},0)`)
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      })
      ctx.restore()

      // Hairline debossed frame.
      ctx.save()
      ctx.strokeStyle = 'rgba(214,188,236,0.20)'; ctx.lineWidth = 2
      roundRectPath(ctx, 46, 46, W - 92, H - 92, 22); ctx.stroke()
      ctx.strokeStyle = 'rgba(30,17,48,0.35)'; ctx.lineWidth = 1
      roundRectPath(ctx, 49, 49, W - 98, H - 98, 20); ctx.stroke()
      ctx.restore()

      // Wordmark in white ink, straight on the cloth — no card needed.
      const ly = 230
      let lh: number
      if (logoInk) {
        const ratio = Math.min(620 / logoInk.width, 200 / logoInk.height)
        const lw = logoInk.width * ratio
        lh = logoInk.height * ratio
        ctx.drawImage(logoInk, 84, ly, lw, lh)
      } else {
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'italic 108px "DM Serif Display", serif'
        ctx.fillText('Suvadu', 84, ly + 112)
        lh = 158
      }

      ctx.fillStyle = '#D3BFEA'; ctx.font = '400 30px "DM Sans", sans-serif'
      ctx.fillText('Make your mark.', 90, ly + lh + 90)
      ctx.fillText('Mark your Suvadu.', 90, ly + lh + 128)

      const ruleGrad = ctx.createLinearGradient(90, 0, 230, 0)
      ruleGrad.addColorStop(0, ROYAL_200); ruleGrad.addColorStop(1, 'rgba(154,102,199,0.25)')
      ctx.strokeStyle = ruleGrad; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(90, H - 210); ctx.lineTo(230, H - 210); ctx.stroke()
      ctx.lineCap = 'butt'

      ctx.fillStyle = '#FFFFFF'; ctx.font = '700 26px "DM Sans", sans-serif'
      ctx.fillText('thesuvadu.com', 90, H - 160)
      ctx.fillStyle = 'rgba(211,191,234,0.78)'; ctx.font = '400 20px "DM Sans", sans-serif'
      ctx.fillText('Premium notebooks, made to trace', 90, H - 122)
    }

    function drawBackCover(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, ROYAL_400); grad.addColorStop(0.5, PURPLE); grad.addColorStop(1, PLUM)
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

      // Concentric rings that fade outwards rather than sitting at one opacity.
      ctx.save(); ctx.strokeStyle = LILAC; ctx.lineWidth = 2
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.16 - i * 0.02
        ctx.beginPath(); ctx.arc(W * 0.5, H * 0.42, 120 + i * 70, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.restore()

      // Vignette to settle the edges.
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.22, W * 0.5, H * 0.42, H * 0.78)
      vig.addColorStop(0, 'rgba(30,17,48,0)'); vig.addColorStop(1, 'rgba(30,17,48,0.42)')
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.globalAlpha = 0.92
      ctx.fillStyle = LILAC; ctx.font = 'italic 46px "DM Serif Display", serif'
      ctx.textAlign = 'center'; ctx.fillText('Suvadu.', W / 2, H - 130)
      ctx.restore()
    }

    function drawRuledPage(ctx: CanvasRenderingContext2D, W: number, H: number) {
      ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H)

      // Warm paper wash — lilac settles into the gutter, light lifts to the fore-edge.
      const wash = ctx.createLinearGradient(0, 0, W, 0)
      wash.addColorStop(0, 'rgba(97,48,146,0.09)')
      wash.addColorStop(0.22, 'rgba(97,48,146,0.02)')
      wash.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H)

      const marg = ctx.createLinearGradient(0, 60, 0, H - 60)
      marg.addColorStop(0, 'rgba(154,102,199,0.10)')
      marg.addColorStop(0.5, 'rgba(97,48,146,0.26)')
      marg.addColorStop(1, 'rgba(154,102,199,0.10)')
      ctx.strokeStyle = marg; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(110, 60); ctx.lineTo(110, H - 60); ctx.stroke()

      // Ruled lines, softened towards the head and foot of the page.
      ctx.lineWidth = 2
      const first = 170, last = H - 80
      for (let y = first; y < last; y += 62) {
        const t = (y - first) / (last - first)
        const fade = 0.055 + 0.055 * Math.sin(Math.PI * t)
        ctx.strokeStyle = `rgba(97,48,146,${fade.toFixed(3)})`
        ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke()
      }

      ctx.fillStyle = 'rgba(97,48,146,0.11)'
      ctx.font = 'italic 26px "DM Serif Display", serif'
      ctx.fillText('Suvadu.', W - 190, H - 40)
    }

    function drawBlankPage(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const paper = ctx.createLinearGradient(0, 0, W, H)
      paper.addColorStop(0, '#FFFFFF'); paper.addColorStop(0.55, '#FDFBFF'); paper.addColorStop(1, '#F6EFFC')
      ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(97,48,146,0.07)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, 0); ctx.stroke()
    }

    // Spine / cover edges: a lit gradient rather than one flat purple, so the
    // binding catches the key light the way a real bound edge does.
    function drawSpine(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, INK_DEEP)
      g.addColorStop(0.28, ROYAL_700)
      g.addColorStop(0.55, PURPLE)
      g.addColorStop(0.82, ROYAL_700)
      g.addColorStop(1, PLUM)
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    }

    // Page block: faintly banded so the stacked leaves read as paper, not plastic.
    function drawPageEdge(ctx: CanvasRenderingContext2D, w: number, h: number) {
      ctx.fillStyle = PAGE; ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(97,48,146,0.07)'
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)
    }

    function drawSolid(hex: string) {
      return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h)
      }
    }

    // ---------- Geometry ----------
    const W = 2.1, H = 2.85, D = 0.16, COVER_D = 0.05, FLY_D = 0.018

    const frontCover = canvasTexture(1024, 1365, drawFrontCover)
    const backCover = canvasTexture(1024, 1365, drawBackCover)
    const ruledPage = canvasTexture(1024, 1365, drawRuledPage)
    const blankPage = canvasTexture(1024, 1365, drawBlankPage)
    const spine = canvasTexture(8, 256, drawSpine)
    const pageEdge = canvasTexture(8, 256, drawPageEdge)
    const insideCover = canvasTexture(8, 8, drawSolid(LILAC))

    const geometries: THREE.BufferGeometry[] = [groundGeo]
    const materials: THREE.Material[] = [groundMat]

    /** Builds a panel material and applies panel-level opacity. depthWrite stays
     *  on so the boards still occlude each other correctly when translucent —
     *  without it the inside cover bleeds through the front cover. */
    function panelMat(opts: THREE.MeshStandardMaterialParameters, opacity: number) {
      const m = new THREE.MeshStandardMaterial(opts)
      if (opacity < 1) {
        m.transparent = true
        m.opacity = opacity
        m.depthWrite = true
      }
      materials.push(m)
      return m
    }

    const book = new THREE.Group()
    scene.add(book)

    // Pages board (fixed) — holds the ruled page that gets written on.
    const pagesMaterials = [
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: spine.tex, roughness: 0.48, metalness: 0.14 }, COVER_OPACITY),
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: ruledPage.tex, roughness: 0.92 }, PAGE_OPACITY),
      panelMat({ map: backCover.tex, roughness: 0.46, metalness: 0.14 }, COVER_OPACITY),
    ]
    const pagesGeo = new THREE.BoxGeometry(W, H, D); geometries.push(pagesGeo)
    const pagesBoard = new THREE.Mesh(pagesGeo, pagesMaterials)
    pagesBoard.castShadow = true; pagesBoard.receiveShadow = true
    book.add(pagesBoard)

    const stackGeo = new THREE.BoxGeometry(D * 0.86, H * 0.965, W * 0.02); geometries.push(stackGeo)
    const pageStack = new THREE.Mesh(stackGeo, panelMat({ map: pageEdge.tex, color: 0xf4eefb, roughness: 1 }, PAGE_OPACITY))
    pageStack.rotation.y = Math.PI / 2
    pageStack.position.set(W / 2 + 0.001, 0, 0)
    pageStack.castShadow = true
    book.add(pageStack)

    // Flyleaf — the blank page that flips to reveal the written page beneath.
    const flyPivot = new THREE.Object3D()
    flyPivot.position.set(-W / 2, 0, D / 2 + FLY_D / 2 + 0.003)
    book.add(flyPivot)
    const flyMaterials = [
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
      panelMat({ map: blankPage.tex, roughness: 0.94 }, PAGE_OPACITY),
      panelMat({ map: blankPage.tex, roughness: 0.94 }, PAGE_OPACITY),
    ]
    const flyGeo = new THREE.BoxGeometry(W, H, FLY_D); geometries.push(flyGeo)
    const flyMesh = new THREE.Mesh(flyGeo, flyMaterials)
    flyMesh.position.set(W / 2, 0, 0)
    flyMesh.castShadow = true
    flyPivot.add(flyMesh)

    // Cover pivot — hinged at the left edge, swings open.
    const coverPivot = new THREE.Object3D()
    coverPivot.position.set(-W / 2, 0, D / 2 + FLY_D + COVER_D / 2 + 0.006)
    book.add(coverPivot)
    const edge = () => panelMat({ map: spine.tex, roughness: 0.48, metalness: 0.14 }, COVER_OPACITY)
    const coverMaterials = [
      edge(), edge(), edge(), edge(),
      panelMat({ map: frontCover.tex, roughness: 0.44, metalness: 0.16 }, COVER_OPACITY),
      panelMat({ map: insideCover.tex, color: 0xeaddf6, roughness: 0.85 }, INSIDE_OPACITY),
    ]
    const coverGeo = new THREE.BoxGeometry(W, H, COVER_D); geometries.push(coverGeo)
    const coverMesh = new THREE.Mesh(coverGeo, coverMaterials)
    coverMesh.position.set(W / 2, 0, 0)
    coverMesh.castShadow = true
    coverPivot.add(coverMesh)

    const REST_Y = 0.5, REST_X = -0.06
    book.rotation.x = REST_X
    book.rotation.y = REST_Y

    // ---------- Late redraws ----------
    // The cover art is set in type, so re-render it once the webfonts resolve —
    // and again once the wordmark has been keyed to white ink.
    function redrawArt() {
      if (disposed) return
      frontCover.redraw(); backCover.redraw(); ruledPage.redraw()
    }
    const logo = new Image()
    logo.onload = () => {
      if (disposed) return
      logoInk = keyToWhiteInk(logo)
      frontCover.redraw()
    }
    logo.src = wordmark
    // Re-fit too: the control strip is measured, and a webfont swap resizes the
    // "Open the notebook" button underneath it.
    document.fonts?.ready.then(() => { if (!disposed) { redrawArt(); resize() } })

    // ---------- Camera framing (showcase) ----------
    // The book stays on the stage's centre line, as in the prototype. The card
    // variant keeps the original hand-tuned distance; the showcase solves for the
    // distance that fits the book — closed, or opened flat — into the banner once
    // the control strip along the bottom is accounted for.
    const CARD_Z = 7.2
    const BASE_Y = 0.35
    // Matched to the prototype: at its 1440×760 stage the book stands ~69% of the
    // frame height, which this reproduces once the control strip is accounted for.
    const FIT_MARGIN = 1.14
    const HALF_H = H / 2
    const CLOSED_HALF_W = W / 2 + D + COVER_D
    // Deliberately tighter than the book's true open reach (~1.5W once the cover
    // has swung past vertical and the flyleaf beyond it). Fitting all of that in
    // would push the camera far enough back to halve the book on a phone; letting
    // the swung cover run off the left edge keeps the page — and the handwriting
    // on it — at a readable size.
    const OPEN_HALF_W = W * 1.02
    // A touch higher again, so the book sits above the banner's midline and the
    // floor shadow has room to read beneath it.
    const EXTRA_LIFT = 0.03
    const tanHalfV = Math.tan((camera.fov * Math.PI) / 360)

    // Strip along the bottom reserved for the drag hint stacked over the "Open the
    // notebook" button — measured rather than guessed, so it tracks the chrome as
    // it reflows (the hint drops out entirely on a phone). Cached, because
    // applyOffsets writes a custom property every frame and reading layout back
    // in the same frame would thrash it.
    let controlPx = 0
    function measureControls() {
      const btn = openBtnRef.current
      if (variant !== 'showcase' || !btn) { controlPx = 0; return }
      const bottom = stage!.getBoundingClientRect().bottom
      let top = btn.getBoundingClientRect().top
      const hint = hintRef.current
      // offsetParent is null while the hint is display:none.
      if (hint?.offsetParent) top = Math.min(top, hint.getBoundingClientRect().top)
      controlPx = Math.max(0, bottom - top) + 12 // a little breathing room above
    }
    function bandFrac() {
      return variant === 'showcase' ? Math.min(0.22, controlPx / Math.max(stageH, 1)) : 0
    }
    function fitZ(open: boolean) {
      if (variant !== 'showcase') return CARD_Z
      const halfW = open ? OPEN_HALF_W : CLOSED_HALF_W
      return Math.max(
        (HALF_H * FIT_MARGIN) / (tanHalfV * (1 - bandFrac() - 2 * EXTRA_LIFT)),
        (halfW * FIT_MARGIN) / (tanHalfV * camera.aspect),
      )
    }
    // Lowering the camera raises the subject on screen. --nb3d-lift moves the
    // handwriting overlay by the same amount, so it lands on the page.
    function applyOffsets() {
      if (variant !== 'showcase') return
      const lift = bandFrac() / 2 + EXTRA_LIFT
      camera.position.y = BASE_Y - lift * 2 * tanHalfV * camera.position.z
      stage!.style.setProperty('--nb3d-lift', `${lift * 100}%`)
    }
    let zTarget = CARD_Z

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

    // ---------- Step sequencer ----------
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    let steps: Step[] = []
    let stepStart = -1
    let running = false

    function run(list: Step[]) { steps = list; stepStart = -1; running = true }
    function tickSteps(now: number) {
      while (running) {
        const s = steps[0]
        if (!s) { running = false; stepStart = -1; return }
        if (s.kind === 'do') { steps.shift(); s.fn(); continue }
        if (stepStart < 0) stepStart = now
        const t = Math.min(1, (now - stepStart) / s.ms)
        if (s.kind === 'tween') s.apply(easeInOutCubic(t))
        if (t < 1) return
        steps.shift(); stepStart = -1
      }
    }
    /** Interpolates one value across a tween, `from` captured when the step runs. */
    function lerpStep(ms: number, get: () => number, to: number, set: (v: number) => void): Step[] {
      let from = 0
      return [
        { kind: 'do', fn: () => { from = get() } },
        { kind: 'tween', ms, apply: (e) => set(from + (to - from) * e) },
      ]
    }

    // ---------- Pen-writing sequence (DOM) ----------
    const OPEN_TARGET = -2.55 // cover swing, ≈ -146°
    const FLIP_TARGET = -2.97 // flyleaf swing, ≈ -170°, past the cover

    /** Widens a line from 0 to its measured width while the pen tip rides the
     *  right-hand edge, so the handwriting appears to be drawn. */
    function writeStep(lineRef: typeof line1Ref, measureRef: typeof measure1Ref): Step[] {
      let target = 0, top = 0, tipDrop = 0
      return [
        {
          kind: 'do',
          fn: () => {
            const line = lineRef.current, m = measureRef.current, pen = penRef.current
            target = m?.getBoundingClientRect().width ?? 0
            top = line?.offsetTop ?? 0
            // Park the nib on the writing line: the tip sits ~22px down inside
            // the 26px pen box, and the baseline is ~0.6 of the line's height.
            tipDrop = (line?.offsetHeight ?? 44) * 0.6 - 22.75
            pen?.classList.add('nb3d--active')
          },
        },
        {
          kind: 'tween',
          ms: 1150,
          apply: (e) => {
            const w = target * e
            if (lineRef.current) lineRef.current.style.width = `${w}px`
            if (penRef.current) {
              penRef.current.style.transform = `translate(${w - 4}px, ${top + tipDrop}px) rotate(${28 - e * 6}deg)`
            }
          },
        },
      ]
    }

    function resetWriting() {
      // Measure both lines up front so the block can be centred as a whole,
      // instead of left-aligned inside an oversized fixed-width container.
      const w1 = measure1Ref.current?.getBoundingClientRect().width ?? 0
      const w2 = measure2Ref.current?.getBoundingClientRect().width ?? 0
      const overlay = overlayRef.current
      if (overlay && w1 && w2) {
        overlay.style.width = `${Math.max(w1, w2)}px`
        overlay.style.maxWidth = 'none'
      }
      if (line1Ref.current) line1Ref.current.style.width = '0px'
      if (line2Ref.current) line2Ref.current.style.width = '0px'
      signRef.current?.classList.remove('nb3d--show')
      const pen = penRef.current
      if (pen) {
        pen.style.transform = 'translate(-4px, 4px) rotate(28deg)'
        pen.classList.remove('nb3d--active')
      }
    }

    /** Snaps both lines to their full measured width — used when the frame
     *  resizes after the writing has already played out. */
    function settleWriting() {
      const w1 = measure1Ref.current?.getBoundingClientRect().width ?? 0
      const w2 = measure2Ref.current?.getBoundingClientRect().width ?? 0
      if (!w1 || !w2) return
      const overlay = overlayRef.current
      if (overlay) overlay.style.width = `${Math.max(w1, w2)}px`
      if (line1Ref.current) line1Ref.current.style.width = `${w1}px`
      if (line2Ref.current) line2Ref.current.style.width = `${w2}px`
    }

    function writingSteps(): Step[] {
      if (reduceMotion) {
        return [{
          kind: 'do',
          fn: () => {
            if (line1Ref.current) line1Ref.current.style.width = 'auto'
            if (line2Ref.current) line2Ref.current.style.width = 'auto'
            signRef.current?.classList.add('nb3d--show')
          },
        }]
      }
      return [
        { kind: 'wait', ms: 200 },
        ...writeStep(line1Ref, measure1Ref),
        { kind: 'wait', ms: 120 },
        ...writeStep(line2Ref, measure2Ref),
        { kind: 'wait', ms: 150 },
        {
          kind: 'do',
          fn: () => {
            penRef.current?.classList.remove('nb3d--active')
            signRef.current?.classList.add('nb3d--show')
          },
        },
      ]
    }

    // ---------- Open / close ----------
    function openBook() {
      if (state !== 'closed') return
      state = 'opening'; isDragging = false
      onOpenChangeRef.current?.(true)
      hintRef.current?.classList.add('nb3d--hidden')
      openBtnRef.current?.classList.add('nb3d--hidden')

      const zTo = fitZ(true)
      zTarget = zTo
      let cFrom = 0, byFrom = 0, bxFrom = 0, zFrom = 0
      run([
        { kind: 'do', fn: () => { cFrom = coverPivot.rotation.y; byFrom = book.rotation.y; bxFrom = book.rotation.x; zFrom = camera.position.z } },
        {
          kind: 'tween',
          ms: 900,
          apply: (e) => {
            coverPivot.rotation.y = cFrom + (OPEN_TARGET - cFrom) * e
            book.rotation.y = byFrom + (0 - byFrom) * e
            book.rotation.x = bxFrom + (-0.05 - bxFrom) * e
            camera.position.z = zFrom + (zTarget - zFrom) * e
          },
        },
        { kind: 'wait', ms: 180 },
        ...lerpStep(750, () => flyPivot.rotation.y, FLIP_TARGET, (v) => { flyPivot.rotation.y = v }),
        {
          kind: 'do',
          fn: () => {
            state = 'open'
            camera.position.z = zTarget // a resize mid-sequence may have moved it
            applyOffsets()
            closeBtnRef.current?.classList.add('nb3d--visible')
            if (tagSubRef.current) tagSubRef.current.textContent = 'Every notebook, made to trace'
            resetWriting()
            overlayRef.current?.classList.add('nb3d--visible')
          },
        },
        ...writingSteps(),
      ])
    }

    function closeBook() {
      if (state !== 'open') return
      state = 'closing'
      onOpenChangeRef.current?.(false)

      let cFrom = 0, byFrom = 0, bxFrom = 0, zFrom = 0
      run([
        {
          kind: 'do',
          fn: () => {
            closeBtnRef.current?.classList.remove('nb3d--visible')
            overlayRef.current?.classList.remove('nb3d--visible')
            penRef.current?.classList.remove('nb3d--active')
            signRef.current?.classList.remove('nb3d--show')
          },
        },
        ...lerpStep(600, () => flyPivot.rotation.y, 0, (v) => { flyPivot.rotation.y = v }),
        { kind: 'do', fn: () => { cFrom = coverPivot.rotation.y; byFrom = book.rotation.y; bxFrom = book.rotation.x; zFrom = camera.position.z; zTarget = fitZ(false) } },
        {
          kind: 'tween',
          ms: 850,
          apply: (e) => {
            coverPivot.rotation.y = cFrom + (0 - cFrom) * e
            book.rotation.y = byFrom + (REST_Y - byFrom) * e
            book.rotation.x = bxFrom + (REST_X - bxFrom) * e
            camera.position.z = zFrom + (zTarget - zFrom) * e
          },
        },
        {
          kind: 'do',
          fn: () => {
            state = 'closed'
            camera.position.z = zTarget
            applyOffsets()
            openBtnRef.current?.classList.remove('nb3d--hidden')
            hintRef.current?.classList.remove('nb3d--hidden')
            if (tagSubRef.current) tagSubRef.current.textContent = 'Drag to explore'
          },
        },
      ])
    }
    openBtnRef.current?.addEventListener('click', openBook)
    closeBtnRef.current?.addEventListener('click', closeBook)

    // ---------- Animate ----------
    let rafId = 0
    function animate(now: number) {
      rafId = requestAnimationFrame(animate)
      tickSteps(now || performance.now())
      if (state === 'closed' && !isDragging) {
        book.rotation.y += velX
        book.rotation.x += velY
        velY *= 0.94
        book.rotation.x *= 0.98
      }
      // Cheap, and it lets the horizontal offset ease toward its target.
      if (variant === 'showcase') applyOffsets()
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
      disposed = true
      cancelAnimationFrame(rafId)
      window.clearTimeout(idleTimer)
      ro.disconnect()
      logo.onload = null
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
  }, [variant])

  return (
    <div ref={stageRef} className={cn('nb3d', variant === 'showcase' && 'nb3d--showcase', className)}>
      <div className="nb3d__tag">Suvadu<span ref={tagSubRef}>Drag to explore</span></div>
      <button ref={closeBtnRef} type="button" className="nb3d__close" aria-label="Close notebook">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
      <div ref={overlayRef} className="nb3d__overlay">
        <div ref={line1Ref} className="nb3d__line">Make your mark.</div>
        <div ref={line2Ref} className="nb3d__line">Mark your Suvadu.</div>
        <div ref={signRef} className="nb3d__sign">— Suvadu.</div>
        {/* The nib that draws the two lines above. */}
        <svg ref={penRef} className="nb3d__pen" viewBox="0 0 24 24" fill="none" aria-hidden>
          <defs>
            <linearGradient id="nb3dPenBody" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#2C1A3E" />
              <stop offset="55%" stopColor="#4E2675" />
              <stop offset="100%" stopColor="#7D45AE" />
            </linearGradient>
          </defs>
          <path d="M3 21l3.2-1 11-11a2 2 0 0 0-3.2-3.2l-11 11L2 20l1 1z" fill="url(#nb3dPenBody)" stroke="#2C1A3E" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M14.5 4.5l3.2 3.2" stroke="#EADDF6" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        </svg>
        {/* Hidden twins, measured to size the block and time each stroke. */}
        <div ref={measure1Ref} className="nb3d__measure" aria-hidden>Make your mark.</div>
        <div ref={measure2Ref} className="nb3d__measure" aria-hidden>Mark your Suvadu.</div>
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
