export interface LabelPosition {
  x: string       // left offset as viewport-% (e.g. "15%")
  y: string       // top offset as viewport-% (e.g. "55%")
  rotation: number // degrees
  maxWidth: string // CSS max-width for the note card
}

export interface SceneBeat {
  id: string
  label: string           // empty string → no label rendered
  description: string
  peak: number            // actual frame number where scene peaks
  rangeStart: number      // first frame of this clip
  rangeEnd: number        // last frame of this clip
  dwellRadius: number     // extra virtual frames on each side of peak (0 = no dwell)
  labelVisibleRange: readonly [number, number] // [fadeInStart, fadeOutEnd]; [0,0] = hidden
  labelPosition: LabelPosition // desktop position; % of viewport, centred on that point
}

// ── Scene beats ───────────────────────────────────────────────────
// 7 clips × 192 frames = 1,344 actual frames.
// Clips:
//   1  frames   1–192   notebook → to-do list        (Assignment Tracker)
//   2  frames 193–384   pan to brass clock            (Exam Tracker)
//   3  frames 385–576   rupee notes + coins           (Expense Splitter)
//   4  frames 577–768   smartphone + red PDF          (Community Hub)
//   5  frames 769–960   diya + chai (aesthetic anchor, no label)
//   6  frames 961–1152  folded exam schedule          (Calendar Sync)
//   7  frames 1153–1344 top-down table reveal + logo
//
// dwellRadius=25 → 50 virtual "extra" frames at each peak ≈ 2 sec at typical scroll speed.
// labelVisibleRange spans peak±60 so the note card is visible on approach + dwell + departure.

export const SCENE_BEATS: readonly SceneBeat[] = [
  {
    id: 'assignment',
    label: 'Assignment Tracker',
    description: 'Never miss a deadline. Log, track, set reminders.',
    peak: 150,
    rangeStart: 1,
    rangeEnd: 192,
    dwellRadius: 25,
    labelVisibleRange: [90, 210],
    // Sits on the open notebook page (left-centre of frame)
    labelPosition: { x: '15%', y: '55%', rotation: -3, maxWidth: '280px' },
  },
  {
    id: 'exam',
    label: 'Exam Tracker',
    description: 'Know when every paper drops. Countdown built in.',
    peak: 340,
    rangeStart: 193,
    rangeEnd: 384,
    dwellRadius: 25,
    labelVisibleRange: [280, 400],
    // Near the brass clock (right side, upper third)
    labelPosition: { x: '68%', y: '22%', rotation: 4, maxWidth: '260px' },
  },
  {
    id: 'expense',
    label: 'Expense Splitter',
    description: 'Split chai, split trips. Settle without the awkwardness.',
    peak: 530,
    rangeStart: 385,
    rangeEnd: 576,
    dwellRadius: 25,
    labelVisibleRange: [470, 590],
    // Beside the rolled rupee notes (left, lower third)
    labelPosition: { x: '20%', y: '65%', rotation: -2, maxWidth: '280px' },
  },
  {
    id: 'community',
    label: 'Community Hub',
    description: 'Share notes, PDFs, chat. One place for the batch.',
    peak: 720,
    rangeStart: 577,
    rangeEnd: 768,
    dwellRadius: 25,
    labelVisibleRange: [660, 780],
    // Next to the smartphone screen (right, mid-lower area)
    labelPosition: { x: '62%', y: '58%', rotation: 2, maxWidth: '280px' },
  },
  {
    id: 'anchor',
    label: '',
    description: '',
    peak: 865,
    rangeStart: 769,
    rangeEnd: 960,
    dwellRadius: 0,   // aesthetic-only — let user scroll through freely
    labelVisibleRange: [0, 0],
    labelPosition: { x: '0%', y: '0%', rotation: 0, maxWidth: '0px' },
  },
  {
    id: 'calendar',
    label: 'Calendar Sync',
    description: 'Exam schedule auto-imported. Never copy a PDF date again.',
    peak: 1100,
    rangeStart: 961,
    rangeEnd: 1152,
    dwellRadius: 25,
    labelVisibleRange: [1040, 1160],
    // On / near the folded schedule paper (left, mid area)
    labelPosition: { x: '25%', y: '50%', rotation: -4, maxWidth: '290px' },
  },
  {
    id: 'logo',
    label: '',
    description: '',
    peak: 1300,
    rangeStart: 1153,
    rangeEnd: 1344,
    dwellRadius: 30,   // longer hold — lets the LogoReveal complete its scale-up
    labelVisibleRange: [0, 0],
    labelPosition: { x: '0%', y: '0%', rotation: 0, maxWidth: '0px' },
  },
]

// ── Derived constants ─────────────────────────────────────────────
// Total extra virtual frames contributed by all dwell zones.
// ScrollScene uses this to compute the scroll-spacer height.
export const TOTAL_DWELL_FRAMES = SCENE_BEATS.reduce(
  (sum, b) => sum + b.dwellRadius * 2,
  0,
)
// = (25+25+25+25+0+25+30) × 2 = 310
