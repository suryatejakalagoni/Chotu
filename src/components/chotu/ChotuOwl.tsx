'use client'

export type OwlMood =
  | 'normal' | 'happy' | 'sleepy' | 'sleep' | 'surprised'
  | 'wink' | 'listening' | 'love' | 'shy' | 'dizzy'

interface OwlProps {
  mood?: OwlMood
  look?: { x: number; y: number }
  size?: number
  talking?: boolean
}

export function ChotuOwl({ mood = 'normal', look = { x: 0, y: 0 }, size = 110, talking = false }: OwlProps) {
  let mouth: 'smile' | 'grin' | 'gasp' | 'open' | 'flat' | 'snore' | 'closed' = 'smile'
  if (mood === 'sleep' || mood === 'sleepy') mouth = 'snore'
  else if (mood === 'happy' || mood === 'love') mouth = 'grin'
  else if (mood === 'surprised') mouth = 'gasp'
  else if (mood === 'shy') mouth = 'flat'
  else if (mood === 'listening') mouth = 'closed'
  else if (mood === 'dizzy') mouth = 'open'
  if (talking && mouth === 'closed') mouth = 'open'

  const lean = mood === 'listening' ? -2 : 0
  const px = Math.max(-1, Math.min(1, look.x)) * 6
  const py = Math.max(-1, Math.min(1, look.y)) * 5
  const pupilR = mood === 'surprised' ? 6 : mood === 'love' ? 8 : 13

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="ch-bellyGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fce6c0" />
          <stop offset="100%" stopColor="#e8c790" />
        </radialGradient>
        <linearGradient id="ch-bodyGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d39564" />
          <stop offset="100%" stopColor="#a96d3f" />
        </linearGradient>
        <radialGradient id="ch-cheekGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(232,118,86,0.55)" />
          <stop offset="100%" stopColor="rgba(232,118,86,0)" />
        </radialGradient>
      </defs>

      {/* contact shadow */}
      <ellipse cx="100" cy="212" rx="58" ry="5" fill="#000" opacity="0.35" />

      <g className="body" transform={`rotate(${lean} 100 130)`}>
        {/* ears */}
        <g className="ears">
          <path d="M48 78 Q52 30 70 30 Q78 50 80 80 Z" fill="#a96d3f" stroke="#5e3818" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M152 78 Q148 30 130 30 Q122 50 120 80 Z" fill="#a96d3f" stroke="#5e3818" strokeWidth="3.5" strokeLinejoin="round" />
        </g>

        {/* body */}
        <path
          d="M100 38 C 50 38 30 90 30 138 C 30 188 60 210 100 210 C 140 210 170 188 170 138 C 170 90 150 38 100 38 Z"
          fill="url(#ch-bodyGrad)" stroke="#5e3818" strokeWidth="4" strokeLinejoin="round"
        />

        {/* wings */}
        <path d="M38 130 Q30 160 50 188 Q44 168 50 138 Z" fill="#8b5530" stroke="#5e3818" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M162 130 Q170 160 150 188 Q156 168 150 138 Z" fill="#8b5530" stroke="#5e3818" strokeWidth="2.5" strokeLinejoin="round" />

        {/* belly */}
        <ellipse cx="100" cy="148" rx="52" ry="58" fill="url(#ch-bellyGrad)" stroke="#5e3818" strokeWidth="3" />

        {/* cheek blush */}
        {(mood === 'love' || mood === 'shy') && (
          <>
            <circle cx="60" cy="130" r="14" fill="url(#ch-cheekGrad)" />
            <circle cx="140" cy="130" r="14" fill="url(#ch-cheekGrad)" />
          </>
        )}

        {/* eyes */}
        <g className="eyes">
          <OwlEye cx={70} cy={106} mood={mood} px={px} py={py} pupilR={pupilR} side="L" />
          <OwlEye cx={130} cy={106} mood={mood} px={px} py={py} pupilR={pupilR} side="R" />
        </g>

        {/* brow tufts */}
        {(mood === 'normal' || mood === 'happy' || mood === 'love' || mood === 'listening' || mood === 'wink' || mood === 'shy') && (
          <g opacity="0.7">
            <path d="M52 86 Q58 82 64 86 Q60 84 56 86" stroke="#5e3818" strokeWidth="1.6" fill="#a96d3f" strokeLinejoin="round" />
            <path d="M148 86 Q142 82 136 86 Q140 84 144 86" stroke="#5e3818" strokeWidth="1.6" fill="#a96d3f" strokeLinejoin="round" />
          </g>
        )}

        {/* belly chevron */}
        <g opacity="0.4" stroke="#a96d3f" strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M88 188 Q100 196 112 188" />
          <path d="M80 178 Q100 188 120 178" opacity="0.7" />
        </g>

        {/* beak */}
        <path
          d={mood === 'surprised'
            ? "M94 144 L106 144 Q100 166 94 144 Z"
            : "M92 142 L108 142 L100 158 Z"}
          fill="#f0a045" stroke="#5e3818" strokeWidth="2.2" strokeLinejoin="round"
        />
        <path d="M94 144 L99 144 L97 150 Z" fill="#ffd24d" opacity="0.5" />

        {/* mouth */}
        <OwlMouth state={mouth} />

        {/* feet */}
        <path d="M80 208 Q78 214 72 214 M80 208 Q82 214 88 214" stroke="#e09343" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 208 Q118 214 112 214 M120 208 Q122 214 128 214" stroke="#e09343" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* dizzy stars */}
      {mood === 'dizzy' && (
        <g className="dizzy-stars">
          {[0, 1, 2].map(i => (
            <text
              key={i}
              x={70 + i * 30} y={26}
              fontSize="14" fill="#ffd24d" fontFamily="Clash Display"
              style={{ animation: 'dizzySpin 1.6s linear infinite', animationDelay: `${i * 0.2}s`, transformOrigin: `${85 + i * 30}px 30px` }}
            >
              ✦
            </text>
          ))}
          <style>{`@keyframes dizzySpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </g>
      )}
    </svg>
  )
}

function OwlEye({ cx, cy, mood, px, py, pupilR, side }: {
  cx: number; cy: number; mood: OwlMood
  px: number; py: number; pupilR: number; side: 'L' | 'R'
}) {
  const stroke = '#5e3818'
  const sw = 3

  if (mood === 'sleep') {
    return <path d={`M${cx - 22} ${cy} Q ${cx} ${cy + 8} ${cx + 22} ${cy}`} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
  }
  if (mood === 'sleepy') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="22" fill="#fff" stroke={stroke} strokeWidth={sw} />
        <path d={`M${cx - 22} ${cy - 4} Q ${cx} ${cy + 12} ${cx + 22} ${cy - 4} L ${cx + 22} ${cy - 22} L ${cx - 22} ${cy - 22} Z`} fill="#a96d3f" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <circle cx={cx + px * 0.5} cy={cy + 6} r={6} fill="#1a0a04" />
      </g>
    )
  }
  if (mood === 'happy') {
    return <path d={`M${cx - 20} ${cy + 6} Q ${cx} ${cy - 14} ${cx + 20} ${cy + 6}`} stroke={stroke} strokeWidth={sw + 0.5} fill="none" strokeLinecap="round" />
  }
  if (mood === 'wink' && side === 'R') {
    return <path d={`M${cx - 20} ${cy + 6} Q ${cx} ${cy - 14} ${cx + 20} ${cy + 6}`} stroke={stroke} strokeWidth={sw + 0.5} fill="none" strokeLinecap="round" />
  }
  if (mood === 'surprised') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="26" fill="#fff" stroke={stroke} strokeWidth={sw} />
        <circle cx={cx + px * 0.5} cy={cy + py * 0.5} r={pupilR} fill="#1a0a04" />
      </g>
    )
  }
  if (mood === 'love') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="22" fill="#fff" stroke={stroke} strokeWidth={sw} />
        <g transform={`translate(${cx - 7 + px * 0.4} ${cy - 6 + py * 0.4}) scale(0.9)`}>
          <path d="M7 0 C 4 -4, -2 -3, -2 3 C -2 8, 4 12, 7 14 C 10 12, 16 8, 16 3 C 16 -3, 10 -4, 7 0 Z" fill="#e8625a" />
        </g>
      </g>
    )
  }
  if (mood === 'listening') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="24" fill="#fff" stroke={stroke} strokeWidth={sw} />
        <circle cx={cx + px} cy={cy + py - 1} r={pupilR + 1} fill="#1a0a04" />
        <circle cx={cx + px + 4} cy={cy + py - 5} r={3.5} fill="#fff" />
        <circle cx={cx + px - 4} cy={cy + py + 4} r={1.6} fill="#fff" opacity="0.85" />
      </g>
    )
  }
  if (mood === 'shy') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="22" fill="#fff" stroke={stroke} strokeWidth={sw} />
        <path d={`M${cx - 18} ${cy - 2} Q ${cx} ${cy + 10} ${cx + 18} ${cy - 2} L ${cx + 18} ${cy - 12} L ${cx - 18} ${cy - 12} Z`} fill="#a96d3f" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <circle cx={cx + px * 0.3} cy={cy + 4} r={5} fill="#1a0a04" />
      </g>
    )
  }
  if (mood === 'dizzy') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="22" fill="#fff" stroke={stroke} strokeWidth={sw} />
        <path d={`M ${cx} ${cy} m -10 0 a 10 10 0 1 1 20 0 a 7 7 0 1 1 -14 0 a 4 4 0 1 1 8 0`} stroke="#1a0a04" strokeWidth="2" fill="none" />
      </g>
    )
  }
  // normal
  return (
    <g>
      <circle cx={cx} cy={cy} r="24" fill="#fff" stroke={stroke} strokeWidth={sw} />
      <circle cx={cx + px} cy={cy + py} r={pupilR} fill="#1a0a04" />
      <circle cx={cx + px + 4} cy={cy + py - 5} r={3.5} fill="#fff" />
      <circle cx={cx + px - 4} cy={cy + py + 4} r={1.6} fill="#fff" opacity="0.85" />
    </g>
  )
}

function OwlMouth({ state }: { state: 'smile' | 'grin' | 'gasp' | 'open' | 'flat' | 'snore' | 'closed' }) {
  const stroke = '#5e3818'
  if (state === 'smile') return <path d="M90 168 Q95 174 100 170 Q105 174 110 168" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  if (state === 'grin') return <path d="M86 165 Q100 184 114 165 Q100 180 86 165 Z" fill="#5e3818" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
  if (state === 'gasp') return <ellipse cx="100" cy="173" rx="6" ry="8" fill="#5e3818" />
  if (state === 'open') return <ellipse cx="100" cy="172" rx="5" ry="4" fill="#5e3818" />
  if (state === 'flat') return <line x1="92" y1="170" x2="108" y2="170" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
  if (state === 'snore') return <path d="M92 170 Q100 174 108 170" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" />
  return null
}

export function ChotuSpeech({ text, side = 'top' }: { text: string; side?: 'top' | 'below' }) {
  return (
    <div
      className={`speech${side === 'below' ? ' below' : ''}`}
      style={{
        [side === 'below' ? 'top' : 'bottom']: 'calc(100% + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {text}
    </div>
  )
}
