import * as THREE from 'three'
import wordmark from '@/assets/suvadu-logo.jpg'

// ── The flying notebook's notebook ─────────────────────────────────────────────────────
// The 3D notebook from the client's Three.js prototype, rebuilt as a plain model
// the flying notebook engine can drive: a continuous `open` amount (rather than a canned
// open/close sequence) so it can be scrubbed, reversed or interrupted at any
// moment, plus a handwriting layer that writes onto the page itself - so the
// message tilts, moves and flies with the book instead of floating over it.

const PURPLE = '#613092'
const PLUM = '#2C1A3E'
const PAGE = '#FCFAFF'
const LILAC = '#F3E8FF'
const ROYAL_700 = '#4E2675'
const ROYAL_400 = '#9A66C7'
const ROYAL_200 = '#D6BCEC'
const INK_DEEP = '#1E1130'
const INK_PEN = '#3F2160'

// Panel opacity - these fade the boards themselves (cover / flyleaf / page
// block), not the artwork printed on them. 1 = fully solid.
const COVER_OPACITY = 0.94
const PAGE_OPACITY = 0.97
const INSIDE_OPACITY = 0.92

// The prototype runs three r128, whose defaults are the pre-colour-management
// ones: canvas textures are sampled raw, lighting is done on those sRGB values,
// and the result is written to the framebuffer unconverted. r160 defaults to
// full colour management instead, which renders the same scene as a muddy
// near-black. Opting out globally is what reproduces the prototype's purple.
THREE.ColorManagement.enabled = false

/** Book dimensions in scene units. */
export const BOOK_W = 2.1
export const BOOK_H = 2.85
const D = 0.16 // page block thickness
const COVER_D = 0.05
const FLY_D = 0.018

const OPEN_TARGET = -2.55 // cover swing, ≈ -146°
const FLIP_TARGET = -2.97 // flyleaf swing, ≈ -170°, past the cover

/** Sideways slide applied as the book opens, so the swung-out cover and the
 *  page together sit around the book's anchor instead of the page alone. */
const OPEN_SHIFT = 0.47

// Handwriting layer: a strip of the ruled page, drawn in a canvas of its own.
const PAGE_TEX_W = 1024
const PAGE_TEX_H = 1365
const INK_W = 1024
const INK_H = 384
const INK_TOP = 318 // page-texture y of the strip's top edge
const INK_X = 150 // left edge of the writing, clear of the margin rule
const INK_FONT = 108
const LINE_BASE = [90, 214] as const // baselines in the strip, sat on ruled lines
const SIGN_BASE = 338

export interface NotebookModel {
  /** Origin at the book's centre. Add to a scene. */
  group: THREE.Group
  /** 0 = closed, 1 = lying open with the page showing. Continuous. */
  setOpen(o: number): void
  /** The message written on the page. */
  setMessage(lines: readonly [string, string], sign: string): void
  /** 0 = blank page, 1 = fully written. Returns the nib in book-local space,
   *  or null once the pen is lifted. */
  setInk(p: number): THREE.Vector3 | null
  /** Re-render the cover and page art - call once fonts and the wordmark land. */
  redrawArt(): void
  dispose(): void
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (t: number) => t * t * (3 - 2 * t)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function createNotebook(renderer: THREE.WebGLRenderer): NotebookModel {
  let disposed = false

  // ---------- Textures (canvas-drawn) ----------
  const textures: THREE.Texture[] = []
  type Redrawable = { tex: THREE.CanvasTexture; redraw: () => void }
  function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void): Redrawable {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d')!
    draw(ctx, w, h)
    const tex = new THREE.CanvasTexture(c)
    // Left unconverted on purpose - the palette was tuned against raw sampling.
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
  // luminance, so the paper drops out and the stroke survives - in white ink.
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
        // A steep ramp rather than a hard threshold: the stroke lands fully
        // opaque while the antialiased edges stay smooth and JPEG noise in the
        // paper still clears completely.
        const a = Math.max(0, Math.min(1, (0.93 - lum) / 0.2))
        px[i] = px[i + 1] = px[i + 2] = 255
        px[i + 3] = Math.round(a * 255)
      }
      ctx.putImageData(data, 0, 0)
      return c
    } catch {
      return null // tainted canvas - the serif fallback carries the cover
    }
  }

  function drawFrontCover(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Deep plum base with a diagonal royal wash - reads as dyed cloth.
    const base = ctx.createLinearGradient(0, 0, W * 0.9, H)
    base.addColorStop(0, ROYAL_700); base.addColorStop(0.45, PLUM); base.addColorStop(1, INK_DEEP)
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)

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

    // Wordmark in white ink, straight on the cloth.
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

    ctx.save(); ctx.strokeStyle = LILAC; ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.16 - i * 0.02
      ctx.beginPath(); ctx.arc(W * 0.5, H * 0.42, 120 + i * 70, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()

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

    // Warm paper wash - lilac settles into the gutter, light lifts to the fore-edge.
    const wash = ctx.createLinearGradient(0, 0, W, 0)
    wash.addColorStop(0, 'rgba(97,48,146,0.09)')
    wash.addColorStop(0.22, 'rgba(97,48,146,0.02)')
    wash.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H)

    const marg = ctx.createLinearGradient(0, 60, 0, H - 60)
    marg.addColorStop(0, 'rgba(154,102,199,0.10)')
    marg.addColorStop(0.5, 'rgba(97,48,146,0.36)')
    marg.addColorStop(1, 'rgba(154,102,199,0.10)')
    ctx.strokeStyle = marg; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(110, 60); ctx.lineTo(110, H - 60); ctx.stroke()

    // Ruled lines, softened towards the head and foot of the page. The
    // handwriting layer sits its baselines on these (170 + 62n).
    ctx.lineWidth = 2
    const first = 170, last = H - 80
    for (let y = first; y < last; y += 62) {
      const t = (y - first) / (last - first)
      const fade = 0.1 + 0.07 * Math.sin(Math.PI * t)
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

  // The inside of the front cover - a royal-purple endpaper with a fine dot grid
  // and a hairline frame, so the open spread has a rich edge to rest against
  // instead of one more pale sheet beside the page.
  function drawEndpaper(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#5A2E85'); g.addColorStop(0.55, ROYAL_700); g.addColorStop(1, '#341A50')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(243,232,255,0.14)'
    for (let y = 14; y < H; y += 20) {
      for (let x = 14; x < W; x += 20) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill() }
    }
    ctx.strokeStyle = 'rgba(243,232,255,0.26)'; ctx.lineWidth = 1.5
    roundRectPath(ctx, 26, 26, W - 52, H - 52, 12); ctx.stroke()
  }

  const frontCover = canvasTexture(PAGE_TEX_W, PAGE_TEX_H, drawFrontCover)
  const backCover = canvasTexture(PAGE_TEX_W, PAGE_TEX_H, drawBackCover)
  const ruledPage = canvasTexture(PAGE_TEX_W, PAGE_TEX_H, drawRuledPage)
  const blankPage = canvasTexture(PAGE_TEX_W, PAGE_TEX_H, drawBlankPage)
  const spine = canvasTexture(8, 256, drawSpine)
  const pageEdge = canvasTexture(8, 256, drawPageEdge)
  const insideCover = canvasTexture(512, 683, drawEndpaper)

  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  /** Builds a panel material and applies panel-level opacity. depthWrite stays
   *  on so the boards still occlude each other correctly when translucent -
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

  // ---------- Geometry ----------
  const group = new THREE.Group()

  // Pages board (fixed) - holds the ruled page that gets written on.
  const pagesMaterials = [
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: spine.tex, roughness: 0.48, metalness: 0.14 }, COVER_OPACITY),
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: ruledPage.tex, roughness: 0.92 }, PAGE_OPACITY),
    panelMat({ map: backCover.tex, roughness: 0.46, metalness: 0.14 }, COVER_OPACITY),
  ]
  const pagesGeo = new THREE.BoxGeometry(BOOK_W, BOOK_H, D); geometries.push(pagesGeo)
  const pagesBoard = new THREE.Mesh(pagesGeo, pagesMaterials)
  pagesBoard.castShadow = true; pagesBoard.receiveShadow = true
  group.add(pagesBoard)

  const stackGeo = new THREE.BoxGeometry(D * 0.86, BOOK_H * 0.965, BOOK_W * 0.02); geometries.push(stackGeo)
  const pageStack = new THREE.Mesh(stackGeo, panelMat({ map: pageEdge.tex, color: 0xf4eefb, roughness: 1 }, PAGE_OPACITY))
  pageStack.rotation.y = Math.PI / 2
  pageStack.position.set(BOOK_W / 2 + 0.001, 0, 0)
  pageStack.castShadow = true
  group.add(pageStack)

  // Flyleaf - the blank page that flips to reveal the written page beneath.
  const flyPivot = new THREE.Object3D()
  flyPivot.position.set(-BOOK_W / 2, 0, D / 2 + FLY_D / 2 + 0.003)
  group.add(flyPivot)
  const flyMaterials = [
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: pageEdge.tex, roughness: 0.95 }, PAGE_OPACITY),
    panelMat({ map: blankPage.tex, roughness: 0.94 }, PAGE_OPACITY),
    panelMat({ map: blankPage.tex, roughness: 0.94 }, PAGE_OPACITY),
  ]
  const flyGeo = new THREE.BoxGeometry(BOOK_W, BOOK_H, FLY_D); geometries.push(flyGeo)
  const flyMesh = new THREE.Mesh(flyGeo, flyMaterials)
  flyMesh.position.set(BOOK_W / 2, 0, 0)
  flyMesh.castShadow = true
  flyPivot.add(flyMesh)

  // Cover pivot - hinged at the left edge, swings open.
  const coverPivot = new THREE.Object3D()
  coverPivot.position.set(-BOOK_W / 2, 0, D / 2 + FLY_D + COVER_D / 2 + 0.006)
  group.add(coverPivot)
  const edge = () => panelMat({ map: spine.tex, roughness: 0.48, metalness: 0.14 }, COVER_OPACITY)
  const coverMaterials = [
    edge(), edge(), edge(), edge(),
    panelMat({ map: frontCover.tex, roughness: 0.44, metalness: 0.16 }, COVER_OPACITY),
    panelMat({ map: insideCover.tex, roughness: 0.7 }, INSIDE_OPACITY),
  ]
  const coverGeo = new THREE.BoxGeometry(BOOK_W, BOOK_H, COVER_D); geometries.push(coverGeo)
  const coverMesh = new THREE.Mesh(coverGeo, coverMaterials)
  coverMesh.position.set(BOOK_W / 2, 0, 0)
  coverMesh.castShadow = true
  coverPivot.add(coverMesh)

  // ---------- Handwriting layer ----------
  let lines: readonly [string, string] = ['Make your mark.', 'Mark your Suvadu.']
  let sign = '- Suvadu.'
  let widths: [number, number] = [0, 0]
  let lastInk = -1

  const inkCanvas = document.createElement('canvas')
  inkCanvas.width = INK_W; inkCanvas.height = INK_H
  const inkCtx = inkCanvas.getContext('2d')!
  const inkTex = new THREE.CanvasTexture(inkCanvas)
  inkTex.colorSpace = THREE.NoColorSpace
  inkTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  textures.push(inkTex)

  const inkGeo = new THREE.PlaneGeometry(BOOK_W, (INK_H / PAGE_TEX_H) * BOOK_H); geometries.push(inkGeo)
  const inkMat = new THREE.MeshStandardMaterial({
    map: inkTex, transparent: true, roughness: 0.94, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  })
  materials.push(inkMat)
  const inkMesh = new THREE.Mesh(inkGeo, inkMat)
  inkMesh.position.set(0, (0.5 - (INK_TOP + INK_H / 2) / PAGE_TEX_H) * BOOK_H, D / 2 + 0.0016)
  inkMesh.receiveShadow = true
  inkMesh.visible = false
  group.add(inkMesh)

  function inkFont(px: number) { return `600 ${px}px Caveat, "Segoe Script", cursive` }

  /** Sizes each line to the page and caches its width - the pen needs both. */
  function measure() {
    inkCtx.font = inkFont(INK_FONT)
    const maxW = PAGE_TEX_W - INK_X - 120
    widths = [0, 0]
    ;([0, 1] as const).forEach((i) => {
      widths[i] = Math.min(inkCtx.measureText(lines[i]).width, maxW)
    })
  }

  /** Draws one line, scaled down to `maxW` if the typeface runs wide. */
  function drawLine(text: string, baseline: number, revealX: number) {
    if (revealX <= 0) return
    const maxW = PAGE_TEX_W - INK_X - 120
    inkCtx.font = inkFont(INK_FONT)
    const natural = inkCtx.measureText(text).width
    const scale = natural > maxW ? maxW / natural : 1
    inkCtx.save()
    // Glyphs like "?" overhang their advance width, so once the line is fully
    // written, extend the clip past it instead of shaving off the last stroke.
    const done = revealX >= natural * scale - 0.5
    inkCtx.beginPath()
    inkCtx.rect(INK_X - 12, 0, revealX + 12 + (done ? 60 : 0), INK_H)
    inkCtx.clip()
    inkCtx.translate(INK_X, baseline)
    inkCtx.scale(scale, scale)
    inkCtx.fillStyle = INK_PEN
    inkCtx.shadowColor = 'rgba(97,48,146,0.22)'
    inkCtx.shadowBlur = 2
    inkCtx.fillText(text, 0, 0)
    inkCtx.restore()
  }

  const nib = new THREE.Vector3()
  function nibAt(lineIdx: 0 | 1, reveal: number): THREE.Vector3 {
    const tx = INK_X + reveal
    const ty = INK_TOP + LINE_BASE[lineIdx] + 4
    nib.set((tx / PAGE_TEX_W - 0.5) * BOOK_W, (0.5 - ty / PAGE_TEX_H) * BOOK_H, D / 2 + 0.002)
    return nib
  }

  // Timeline on p ∈ [0, 1]: line one, a breath, line two, a breath, signature.
  const L1 = [0.0, 0.4] as const
  const L2 = [0.46, 0.88] as const
  const SG = [0.9, 1.0] as const

  function setInk(p: number): THREE.Vector3 | null {
    const k = clamp01(p)
    if (k !== lastInk) {
      lastInk = k
      inkMesh.visible = k > 0
      inkCtx.clearRect(0, 0, INK_W, INK_H)
      if (k > 0) {
        const r1 = widths[0] * smooth(clamp01((k - L1[0]) / (L1[1] - L1[0])))
        const r2 = widths[1] * smooth(clamp01((k - L2[0]) / (L2[1] - L2[0])))
        drawLine(lines[0], LINE_BASE[0], r1)
        drawLine(lines[1], LINE_BASE[1], r2)
        const sa = easeOut(clamp01((k - SG[0]) / (SG[1] - SG[0])))
        if (sa > 0) {
          inkCtx.save()
          inkCtx.globalAlpha = 0.9 * sa
          inkCtx.fillStyle = ROYAL_700
          inkCtx.font = 'italic 44px "DM Serif Display", serif'
          inkCtx.fillText(sign, INK_X, SIGN_BASE)
          inkCtx.restore()
        }
      }
      inkTex.needsUpdate = true
    }
    // The pen is on the page only while a line is actually being drawn.
    if (k <= 0 || k >= L2[1] + 0.01) return null
    if (k < L2[0] - 0.02) return nibAt(0, widths[0] * smooth(clamp01((k - L1[0]) / (L1[1] - L1[0]))))
    if (k >= L2[0]) return nibAt(1, widths[1] * smooth(clamp01((k - L2[0]) / (L2[1] - L2[0]))))
    return null
  }

  function setMessage(next: readonly [string, string], nextSign: string) {
    lines = next; sign = nextSign
    measure()
    lastInk = -1 // force a redraw on the next setInk
  }
  measure()

  // ---------- Open / close ----------
  function setOpen(o: number) {
    const k = clamp01(o)
    coverPivot.rotation.y = OPEN_TARGET * smooth(clamp01(k / 0.56))
    flyPivot.rotation.y = FLIP_TARGET * smooth(clamp01((k - 0.46) / 0.46))
    group.position.x = OPEN_SHIFT * BOOK_W * smooth(clamp01(k / 0.8))
  }

  // ---------- Late redraws ----------
  // The cover art is set in type, so re-render it once the webfonts resolve -
  // and again once the wordmark has been keyed to white ink.
  function redrawArt() {
    if (disposed) return
    frontCover.redraw(); backCover.redraw(); ruledPage.redraw()
    measure()
    lastInk = -1
  }
  const logo = new Image()
  logo.onload = () => {
    if (disposed) return
    logoInk = keyToWhiteInk(logo)
    frontCover.redraw()
  }
  logo.src = wordmark

  return {
    group,
    setOpen,
    setMessage,
    setInk,
    redrawArt,
    dispose() {
      disposed = true
      logo.onload = null
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
    },
  }
}
