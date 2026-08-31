import type { SVGProps } from 'react'

type I = SVGProps<SVGSVGElement>
const base = (p: I) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
})

export const Search = (p: I) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
export const Heart = ({ filled, ...p }: I & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}><path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 6 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" /></svg>
)
export const Cart = (p: I) => (
  <svg {...base(p)}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2 12.3a1.6 1.6 0 0 0 1.6 1.3h9.5a1.6 1.6 0 0 0 1.6-1.2L21 7H5" /></svg>
)
export const User = (p: I) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M5.5 21a7 7 0 0 1 13 0" /></svg>
)
export const Menu = (p: I) => (
  <svg {...base(p)}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
)
export const Close = (p: I) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const ChevronDown = (p: I) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
)
export const ChevronRight = (p: I) => (
  <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
)
export const Plus = (p: I) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const Minus = (p: I) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
)
export const Trash = (p: I) => (
  <svg {...base(p)}><path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
)
export const Star = ({ filled, ...p }: I & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.5 14.6 9l5.9.6-4.4 4 1.3 5.8L12 16.9 6.6 19.4 7.9 13.6 3.5 9.6 9.4 9Z" />
  </svg>
)
export const ArrowRight = (p: I) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const Check = (p: I) => (
  <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>
)
export const Share = (p: I) => (
  <svg {...base(p)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" /></svg>
)
export const Zoom = (p: I) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
)
export const Whatsapp = (p: I) => (
  <svg {...base(p)}><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8.5 8.8c0 3 2.2 5.2 5.2 5.2.5 0 1.3-.5 1.3-1.1 0-.3-1.5-1-1.8-1s-.6.7-.9.7c-.7 0-2.2-1.5-2.2-2.2 0-.3.7-.6.7-.9s-.7-1.8-1-1.8c-.6 0-1.1.8-1.1 1.3Z" /></svg>
)
/** Solid WhatsApp mark — reads far better than the outline glyph when reversed
 *  out in white on the floating chat button. */
export const WhatsappSolid = (p: I) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.966 1.164-.199.199-.397.223-.694.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.446.52-.669.174-.223.232-.373.347-.62.116-.249.058-.472-.03-.62-.087-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
)
export const Instagram = (p: I) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
)
export const Facebook = (p: I) => (
  <svg {...base(p)}><path d="M14 9V7a2 2 0 0 1 2-2h2V2h-3a4 4 0 0 0-4 4v3H8v3h3v9h3v-9h3l1-3Z" /></svg>
)
export const Pinterest = (p: I) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 20c-.4-1.4 0-3 .4-4.6.3-1.2 1.1-4.4 1.1-4.4s-.3-.6-.3-1.4c0-1.3.8-2.3 1.7-2.3.8 0 1.2.6 1.2 1.4 0 .8-.5 2.1-.8 3.2-.2 1 .5 1.7 1.4 1.7 1.7 0 2.9-2.2 2.9-4.7 0-2-1.4-3.4-3.8-3.4-2.7 0-4.4 2-4.4 4.2 0 .8.3 1.4.7 1.8l-.3 1c0 .2-.2.3-.4.2-1.1-.5-1.7-1.9-1.7-3.2 0-2.6 2-5 5.9-5 3.1 0 5.3 2.2 5.3 4.9 0 3.2-1.8 5.5-4.4 5.5-.9 0-1.7-.5-2-1Z" /></svg>
)
export const Mail = (p: I) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
)
export const Leaf = (p: I) => (
  <svg {...base(p)}><path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 9-4 13-9 13-2 0-4-1-4-1" /><path d="M11 20c0-4 2-7 6-9" /></svg>
)
export const Truck = (p: I) => (
  <svg {...base(p)}><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
)
export const Sparkle = (p: I) => (
  <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg>
)
export const Pen = (p: I) => (
  <svg {...base(p)}><path d="M12 19l7-7 3 3-7 7-3 0 0-3z" /><path d="M18 13l-1.5-1.5M2 2l7.5 7.5M2 2l1 6 6 1M2 2l6 1 1 6" /></svg>
)
export const Eye = (p: I) => (
  <svg {...base(p)}><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></svg>
)
export const EyeOff = (p: I) => (
  <svg {...base(p)}>
    <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17.6 17.6 0 0 1-2.5 3.1M6.4 7.9A17.4 17.4 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 4-.8" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
)
