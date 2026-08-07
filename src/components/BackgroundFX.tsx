/**
 * Ambient animated background — drifting aurora orbs in the SUVADU palette,
 * a soft grain overlay, and slowly twinkling sparkles. Decorative only:
 * fixed behind all content, non-interactive, and disabled for users who
 * prefer reduced motion (see .bg-fx rules in index.css).
 */

// Big blurred colour orbs (brand palette). Position + drift + timing per orb.
const ORBS = [
  { color: '#C9A8F0', size: 460, top: '-8%', left: '-6%', anim: 'bgfx-drift-a', dur: 19 },
  { color: '#F3C7DA', size: 400, top: '8%', left: '70%', anim: 'bgfx-drift-b', dur: 24 },
  { color: '#B9D6EE', size: 520, top: '58%', left: '-10%', anim: 'bgfx-drift-c', dur: 28 },
  { color: '#D8C4F2', size: 440, top: '62%', left: '66%', anim: 'bgfx-drift-d', dur: 22 },
]

// Deterministic sparkle field (x%, y%, delay s, duration s, scale).
const SPARKS = [
  [8, 22, 0.0, 7.5, 1.0], [18, 64, 1.8, 9.0, 0.7], [27, 12, 3.2, 6.5, 0.9],
  [34, 81, 0.6, 8.5, 1.1], [42, 38, 2.4, 7.0, 0.6], [51, 70, 4.0, 9.5, 1.0],
  [58, 18, 1.2, 6.8, 0.8], [64, 52, 3.6, 8.2, 1.2], [71, 86, 0.9, 7.2, 0.7],
  [77, 30, 2.8, 9.2, 0.9], [83, 60, 4.4, 6.6, 1.0], [90, 16, 1.5, 8.8, 0.8],
  [94, 74, 3.0, 7.6, 1.1], [13, 44, 2.0, 8.0, 0.6], [46, 8, 4.6, 9.0, 0.9],
  [68, 40, 0.4, 7.0, 0.7],
] as const

export default function BackgroundFX() {
  return (
    <div className="bg-fx" aria-hidden>
      {ORBS.map((o, i) => (
        <span
          key={i}
          className="bg-fx__orb"
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            backgroundColor: o.color,
            animation: `${o.anim} ${o.dur}s ease-in-out infinite`,
          }}
        />
      ))}

      {SPARKS.map(([x, y, delay, dur, scale], i) => (
        <span
          key={`s-${i}`}
          className="bg-fx__spark"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: `scale(${scale})`,
            animation: `bgfx-twinkle ${dur}s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}

      <div className="bg-fx__grain" />
    </div>
  )
}
