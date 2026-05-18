import {
  startOfDay,
  endOfDay,
  endOfWeek,
  endOfMonth,
  startOfWeek,
  startOfMonth,
  addDays,
  addMonths,
  setHours,
  setMinutes,
  getDay,
  isValid,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low'

export type SpendingRange =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last_week'
  | 'month'
  | 'last_month'

export type ParsedAction =
  | {
      kind: 'expense'
      amount: number
      description: string
      category_name: string
      confidence: Confidence
      raw: string
    }
  | {
      kind: 'income'
      amount: number
      source?: string
      category_name: string
      confidence: Confidence
      raw: string
    }
  | {
      kind: 'assignment'
      subject: string
      title: string
      due_at: Date
      confidence: Confidence
      raw: string
    }
  | {
      kind: 'exam'
      subject: string
      exam_type: string
      exam_at: Date
      confidence: Confidence
      raw: string
    }
  | {
      kind: 'attendance_placeholder'
      subject: string
      confidence: Confidence
      raw: string
    }
  | {
      kind: 'query_spending'
      range: SpendingRange
      category_name?: string
      confidence: Confidence
      raw: string
    }
  | {
      kind: 'custom_reminder'
      text: string
      trigger_at: Date
      confidence: Confidence
      raw: string
    }
  | { kind: 'unknown'; reason: string; raw: string }

// ─── Number normaliser ────────────────────────────────────────────────────────

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

const MULTIPLIERS: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  lakh: 1_00_000, lac: 1_00_000, lakhs: 1_00_000, lacs: 1_00_000,
}

export function parseNumber(raw: string): number | null {
  let s = raw
    .trim()
    .replace(/^[₹\s]*(?:rs\.?|rupees?)\s*/i, '')
    .replace(/\s*(?:rs\.?|rupees?)\s*$/i, '')
    .replace(/,/g, '')
    .replace(/\.+$/, '')
    .toLowerCase()
    .trim()

  // Pure numeric (digits only)
  if (/^\d+(\.\d{1,2})?$/.test(s)) {
    const n = parseFloat(s)
    return n > 0 && n <= 1_000_000 ? n : null
  }

  // Word-based: "fifty", "fifteen hundred", "two lakh"
  const tokens = s.split(/\s+/)
  let total = 0
  let current = 0

  for (const token of tokens) {
    if (token in ONES) {
      current += ONES[token]
    } else if (token in MULTIPLIERS) {
      const mult = MULTIPLIERS[token]
      if (mult === 100) {
        current = (current || 1) * 100
      } else {
        total += (current || 1) * mult
        current = 0
      }
    } else if (/^\d+(\.\d{1,2})?$/.test(token)) {
      current += parseFloat(token)
    } else {
      return null
    }
  }

  total += current
  return total > 0 && total <= 1_000_000 ? total : null
}

// ─── Date parser ──────────────────────────────────────────────────────────────

const DAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

const MAX_DATE_OFFSET_MS = 5 * 365 * 24 * 60 * 60 * 1000

// Returns the next occurrence of targetDay (0=Sun) from `from`.
// minDaysAhead=0 includes today; minDaysAhead=1 means at least tomorrow.
function nextWeekdayFrom(targetDay: number, from: Date, minDaysAhead: number): Date {
  const fromDay = getDay(from)
  let diff = targetDay - fromDay
  if (diff < minDaysAhead) diff += 7
  return startOfDay(addDays(from, diff))
}

function extractTime(s: string): { hours: number; minutes: number } | null {
  // "at 5", "at 5pm", "at 17:00", "at 5:30am"
  const withAt = s.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
  if (withAt) return applyAmPm(parseInt(withAt[1]), withAt[2] ? parseInt(withAt[2]) : 0, withAt[3])

  // Standalone "6pm", "5:30am" (no "at" prefix) — only when am/pm is explicit
  const standalone = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (standalone) return applyAmPm(parseInt(standalone[1]), standalone[2] ? parseInt(standalone[2]) : 0, standalone[3])

  return null
}

function applyAmPm(h: number, m: number, ampm: string | undefined): { hours: number; minutes: number } {
  const period = ampm?.toLowerCase()
  if (period === 'pm' && h < 12) h += 12
  else if (period === 'am' && h === 12) h = 0
  else if (!period && h >= 1 && h <= 6) h += 12  // heuristic: 1-6 without am/pm → PM
  return { hours: h, minutes: m }
}

function applyTimeTo(date: Date, time: { hours: number; minutes: number } | null): Date {
  if (!time) return date
  return setMinutes(setHours(date, time.hours), time.minutes)
}

function parseNumericDate(s: string, now: Date): Date | null {
  // "5th december", "5 dec", "dec 5", "5/12"
  const dayMon  = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)$/)
  const monDay  = s.match(/^([a-z]+)\s+(\d{1,2})$/)
  const slashDM = s.match(/^(\d{1,2})\/(\d{1,2})$/)

  let day: number | null = null
  let month: number | null = null

  if (dayMon) {
    day   = parseInt(dayMon[1])
    month = MONTH_NAMES[dayMon[2]] ?? null
  } else if (monDay) {
    month = MONTH_NAMES[monDay[1]] ?? null
    day   = parseInt(monDay[2])
  } else if (slashDM) {
    day   = parseInt(slashDM[1])     // DD/MM (India)
    month = parseInt(slashDM[2]) - 1
  }

  if (day === null || month === null || day < 1 || day > 31 || month < 0 || month > 11) {
    return null
  }

  let date = new Date(now.getFullYear(), month, day)
  if (!isValid(date)) return null

  // If already passed this year, use next year
  if (date < startOfDay(now)) {
    date = new Date(now.getFullYear() + 1, month, day)
  }
  return isValid(date) ? startOfDay(date) : null
}

// Exported so it can be used in voice-modal.tsx for display.
export function parseDate(phrase: string, now: Date): Date | null {
  // Strip leading "due / by / on / before / for"
  const s = phrase
    .trim()
    .toLowerCase()
    .replace(/^(?:due\s+(?:by\s+)?|by\s+|on\s+|before\s+|for\s+)/, '')
    .trim()

  const time = extractTime(s)

  // Remove the time portion to isolate the date component
  const dateOnly = s
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i, '') // standalone with explicit am/pm
    .trim()

  let base: Date | null = null

  if (!dateOnly || dateOnly === 'today' || dateOnly === 'now') {
    base = startOfDay(now)
  } else if (/^tomorrow/.test(dateOnly)) {
    base = startOfDay(addDays(now, 1))
  } else if (/^yesterday/.test(dateOnly)) {
    base = startOfDay(addDays(now, -1))
  } else if (dateOnly === 'tonight') {
    return setMinutes(setHours(startOfDay(now), 20), 0)
  } else if (dateOnly === 'this week') {
    return endOfWeek(now, { weekStartsOn: 1 })
  } else if (dateOnly === 'this month') {
    return endOfMonth(now)
  } else if (/^next\s+\S+/.test(dateOnly)) {
    const dayWord = dateOnly.replace(/^next\s+/, '')
    if (dayWord in DAY_NAMES) {
      // "next Monday" = next occurrence starting from tomorrow
      base = nextWeekdayFrom(DAY_NAMES[dayWord], addDays(now, 1), 0)
    }
  } else if (dateOnly in DAY_NAMES) {
    // Bare day name: next occurrence, can include today (minDaysAhead=0)
    base = nextWeekdayFrom(DAY_NAMES[dateOnly], now, 0)
  } else {
    base = parseNumericDate(dateOnly, now)
  }

  if (!base) return null

  const result = applyTimeTo(base, time)
  if (Math.abs(result.getTime() - now.getTime()) > MAX_DATE_OFFSET_MS) return null

  return result
}

// ─── Income keyword → category ────────────────────────────────────────────────

// Uses the actual seeded income category names from Day 3 DB (user_id IS NULL).
const INCOME_CATEGORY_MAP: Array<[readonly string[], string]> = [
  [['allowance', 'pocket money', 'pocket'], 'Allowance'],
  [['scholarship', 'merit', 'fellowship', 'stipend', 'bursary'], 'Scholarship'],
  [['part-time', 'parttime', 'part time', 'job', 'internship', 'salary', 'wages', 'work', 'freelance'], 'Part-time Job'],
  [['gift', 'gifts', 'birthday', 'festival', 'diwali', 'eid', 'present'], 'Gifts'],
]

function incomeKeywordToCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const [keywords, category] of INCOME_CATEGORY_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category
    }
  }
  return 'Other Income'
}

// ─── Keyword → category ───────────────────────────────────────────────────────

// Uses the actual seeded category names from Day 3 DB (user_id IS NULL).
const CATEGORY_MAP: Array<[readonly string[], string]> = [
  [['food', 'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'eat', 'eating', 'meal',
    'tiffin', 'biryani', 'veg', 'mess', 'canteen', 'chai', 'tea', 'coffee',
    'juice', 'drink', 'sweets', 'bakery', 'restaurant'], 'Food'],
  [['bus', 'auto', 'train', 'uber', 'ola', 'taxi', 'rickshaw', 'metro', 'cab',
    'bike', 'fuel', 'petrol', 'diesel', 'fare', 'ticket', 'travel', 'commute',
    'rapido', 'share', 'toll'], 'Transport'],
  [['book', 'books', 'stationery', 'pen', 'pencil', 'notebook', 'notes', 'textbook',
    'xerox', 'photocopy', 'print', 'printing', 'binding', 'bindingfile', 'record',
    'lab manual', 'assignment book', 'graph'], 'Books & Study'],
  [['fees', 'fee', 'tuition', 'semester', 'hall ticket', 'college', 'exam fee',
    'admission', 'challan'], 'College Fees'],
  [['movie', 'film', 'netflix', 'hotstar', 'prime', 'youtube', 'ott', 'game',
    'gaming', 'cinema', 'concert', 'show', 'outing', 'party', 'fun',
    'subscription', 'spotify'], 'Entertainment'],
  [['clothes', 'shirt', 'pants', 'jeans', 'shoes', 'chappal', 'shopping',
    'mall', 'amazon', 'flipkart', 'dress', 'top', 'kurta', 'saree', 'watch',
    'bag'], 'Shopping'],
  [['medicine', 'medical', 'doctor', 'hospital', 'pharmacy', 'tablet', 'tablets',
    'pill', 'pills', 'injection', 'clinic', 'consultation', 'health'], 'Medical'],
  [['recharge', 'mobile', 'data', 'sim', 'internet', 'broadband', 'jio', 'airtel',
    'vi', 'bsnl', 'wifi', 'hotspot', 'phone bill'], 'Phone & Internet'],
  [['rent', 'pg', 'room', 'accommodation', 'hostel', 'deposit', 'mess bill'], 'Rent'],
]

export function keywordToCategory(text: string): { name: string; matched: boolean } {
  const lower = text.toLowerCase()
  for (const [keywords, category] of CATEGORY_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return { name: category, matched: true }
    }
  }
  return { name: 'Miscellaneous', matched: false }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function titleCase(s: string): string {
  return s.replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase())
}

// ─── Sub-parsers ──────────────────────────────────────────────────────────────

function trySpendingQuery(raw: string, s: string): ParsedAction | null {
  const isQuery = /\b(?:how\s+much|what\s+did\s+i\s+spend|what\s+have\s+i\s+spent|total\s+spend|show.*(?:expense|spending)|my\s+expenses?|spent\s+this)\b/.test(s)
  if (!isQuery) return null

  let range: SpendingRange = 'month'
  let confidence: Confidence = 'medium'

  if (/\btoday\b/.test(s))            { range = 'today';      confidence = 'high' }
  else if (/\byesterday\b/.test(s))   { range = 'yesterday';  confidence = 'high' }
  else if (/\bthis\s+week\b/.test(s)) { range = 'week';       confidence = 'high' }
  else if (/\bthis\s+month\b/.test(s)){ range = 'month';      confidence = 'high' }
  else if (/\blast\s+week\b/.test(s)) { range = 'last_week';  confidence = 'high' }
  else if (/\blast\s+month\b/.test(s)){ range = 'last_month'; confidence = 'high' }

  const catMatch = s.match(/\bon\s+([a-z]+(?:\s+[a-z]+)?)\b/i)
  let category_name: string | undefined
  if (catMatch) {
    const { name, matched } = keywordToCategory(catMatch[1])
    if (matched) category_name = name
  }

  return { kind: 'query_spending', range, category_name, confidence, raw }
}

function tryReminder(raw: string, s: string): ParsedAction | null {
  const prefixMatch = s.match(
    /^(?:remind\s+(?:me\s+)?to|set\s+(?:a\s+)?reminder\s+(?:to|for)|reminder\s+(?:to|for)|remember\s+to)\s+(.+)/i,
  )
  if (!prefixMatch) return null

  const now = new Date()
  let text = prefixMatch[1].trim()

  // Extract time: "by 6pm", "at 5pm tomorrow", "next monday"
  const timePhraseMatch = text.match(/\s+(?:by|at|on|before)\s+(.+)$/)
  let trigger_at: Date
  let confidence: Confidence = 'medium'

  if (timePhraseMatch) {
    text = text.slice(0, text.length - timePhraseMatch[0].length).trim()
    const parsed = parseDate(timePhraseMatch[1], now)
    if (parsed) {
      trigger_at = parsed
      confidence = 'high'
    } else {
      trigger_at = new Date(now.getTime() + 60 * 60 * 1000)
      confidence = 'low'
    }
  } else {
    trigger_at = new Date(now.getTime() + 60 * 60 * 1000)
  }

  if (!text) return null
  return { kind: 'custom_reminder', text: capFirst(text), trigger_at, confidence, raw }
}

function tryAttendance(raw: string, s: string): ParsedAction | null {
  const m = s.match(
    /^(?:attended?\s+|had\s+(?:a\s+)?class\s+(?:for\s+|in\s+)?|went\s+to\s+(?:class\s+(?:for\s+|in\s+)?)?|mark(?:ed)?\s+(?:me\s+)?(?:as\s+)?present\s+(?:for\s+|in\s+)?|present\s+(?:for|in)\s+)(.+)/i,
  )
  if (!m) return null

  // Strip trailing date words
  const subject = m[1]
    .replace(/\s+(?:today|yesterday|now|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this\s+\w+|last\s+\w+)$/i, '')
    .replace(/^(?:for|in)\s+/i, '')
    .trim()

  if (!subject) return null
  return {
    kind: 'attendance_placeholder',
    subject: capFirst(subject),
    confidence: 'high',
    raw,
  }
}

function tryExam(raw: string, s: string): ParsedAction | null {
  const m = s.match(
    /^(.+?)\s+(exam|test|viva|midsem|mid[-\s]sem|endsem|end[-\s]sem|practical|quiz|assessment|internals?|externals?)\s*(?:on\s+|at\s+)?(.+)?$/i,
  )
  if (!m) return null

  const now = new Date()
  const subject  = capFirst(m[1].trim())
  const examType = titleCase(m[2].trim().replace(/\s+/g, '-'))
  const rawDate  = m[3]?.trim() ?? ''

  const parsedDate = rawDate ? parseDate(rawDate, now) : null
  const exam_at    = parsedDate ?? startOfDay(addDays(now, 1))
  const confidence: Confidence = parsedDate ? 'high' : 'medium'

  return { kind: 'exam', subject, exam_type: examType, exam_at, confidence, raw }
}

function tryAssignment(raw: string, s: string): ParsedAction | null {
  const now = new Date()
  let subject = ''
  let title   = ''
  let datePhrase = ''
  let confidence: Confidence = 'high'

  // A-A: subject + task word + due/by + date
  const mA = s.match(
    /^(.+?)\s+(?:assignment|homework|hw|lab|project|record|work)\s+(?:due(?:\s+by)?|by|before|on)\s+(.+)$/i,
  )
  if (mA) {
    subject    = capFirst(mA[1].trim())
    title      = `${subject} Assignment`
    datePhrase = mA[2].trim()
  }

  // A-B: submit/complete/finish + subject + (task word?) + by/due + date
  if (!subject) {
    const mB = s.match(
      /^(?:submit|complete|finish)\s+(.+?)\s+(?:assignment|homework|lab|project|record)?\s*(?:by|due|before|on)\s+(.+)$/i,
    )
    if (mB) {
      subject    = capFirst(mB[1].trim())
      title      = `${subject} Assignment`
      datePhrase = mB[2].trim()
    }
  }

  // A-C: "X due DATE" or "X by DATE" — fallback, MEDIUM confidence
  if (!subject) {
    const mC = s.match(/^(.+?)\s+(?:due|by)\s+(.+)$/i)
    if (mC) {
      title      = capFirst(mC[1].trim())
      subject    = title.split(' ')[0]
      datePhrase = mC[2].trim()
      confidence = 'medium'
    }
  }

  if (!subject) return null

  const parsedDate = datePhrase ? parseDate(datePhrase, now) : null
  const due_at     = parsedDate ?? startOfDay(addDays(now, 1))
  if (!parsedDate && confidence === 'high') confidence = 'medium'

  return {
    kind: 'assignment',
    subject,
    title: title || `${subject} Assignment`,
    due_at,
    confidence,
    raw,
  }
}

function tryIncome(raw: string, s: string): ParsedAction | null {
  const DIGITS = /(\d[\d,]*(?:\.\d{1,2})?)/

  // I-A: received/earned + amount + (from/as/by/for)? + source?
  const mA = s.match(new RegExp(
    `^(?:received?|earned?)\\s+${DIGITS.source}\\s*(?:rupees?|rs\\.?|₹)?(?:\\s+(?:from|as|by|for)\\s+(.+))?$`, 'i',
  ))
  if (mA) {
    const amount = parseNumber(mA[1])
    if (amount) return buildIncome(amount, mA[2]?.trim(), raw, 'high')
  }

  // I-B: got + amount + from/as + source (NOT "got + desc + for + amount" which is expense)
  const mB = s.match(new RegExp(
    `^got\\s+${DIGITS.source}\\s*(?:rupees?|rs\\.?|₹)?\\s+(?:from|as)\\s+(.+)$`, 'i',
  ))
  if (mB) {
    const amount = parseNumber(mB[1])
    if (amount) return buildIncome(amount, mB[2]?.trim(), raw, 'high')
  }

  // I-C: known income keyword + amount
  const mC = s.match(new RegExp(
    `^(allowance|scholarship|stipend|salary|gift)\\s+(?:of\\s+)?(?:rs\\.?\\s*|₹\\s*)?${DIGITS.source}`, 'i',
  ))
  if (mC) {
    const amount = parseNumber(mC[2])
    if (amount) return buildIncome(amount, mC[1].trim(), raw, 'high')
  }

  // I-D: amount + from + known income source word
  const mD = s.match(new RegExp(
    `^${DIGITS.source}\\s*(?:rupees?|rs\\.?|₹)?\\s+from\\s+(.+)$`, 'i',
  ))
  if (mD) {
    const amount = parseNumber(mD[1])
    const source = mD[2]?.trim()
    if (amount && source && /allowance|scholarship|stipend|salary|job|work|gift|dad|mom|parents?|family/i.test(source)) {
      return buildIncome(amount, source, raw, 'high')
    }
  }

  return null
}

function buildIncome(
  amount: number,
  sourceRaw: string | undefined,
  raw: string,
  confidence: Confidence,
): ParsedAction | null {
  if (amount <= 0 || amount > 1_000_000) return null
  const source = sourceRaw ? capFirst(sourceRaw) : undefined
  const category_name = incomeKeywordToCategory(source ?? '')
  return { kind: 'income', amount, source, category_name, confidence, raw }
}

function tryExpense(raw: string, s: string): ParsedAction | null {
  const DIGITS = /(\d[\d,]*(?:\.\d{1,2})?)/

  // E-A: verb + amount + on/for + description
  const mA = s.match(new RegExp(
    `^(?:spent|spend|paid|pay|bought|buy|got)\\s+${DIGITS.source}\\s*(?:rupees?|rs\\.?|₹)?\\s+(?:on|for|at)\\s+(.+)`, 'i',
  ))
  if (mA) {
    const amount = parseNumber(mA[1])
    if (amount) return buildExpense(amount, mA[2].trim(), raw, 'high')
  }

  // E-B: amount + (rupees?) + on/for + description
  const mB = s.match(new RegExp(
    `^${DIGITS.source}\\s*(?:rupees?|rs\\.?|₹)?\\s+(?:on|for)\\s+(.+)`, 'i',
  ))
  if (mB) {
    const amount = parseNumber(mB[1])
    if (amount) return buildExpense(amount, mB[2].trim(), raw, 'high')
  }

  // E-D: bought/got + description + for + amount
  const mD = s.match(new RegExp(
    `^(?:bought|buy|got)\\s+(.+?)\\s+(?:for|at)\\s+${DIGITS.source}`, 'i',
  ))
  if (mD) {
    const amount = parseNumber(mD[2])
    if (amount) return buildExpense(amount, mD[1].trim(), raw, 'high')
  }

  // E-C: description + amount (inverted, MEDIUM confidence)
  const mC = s.match(new RegExp(`^(.+?)\\s+${DIGITS.source}\\s*(?:rupees?|rs\\.?)?$`, 'i'))
  if (mC) {
    const amount = parseNumber(mC[2])
    if (amount) return buildExpense(amount, mC[1].trim(), raw, 'medium')
  }

  // E-W: word-based amount, e.g. "spent fifty on chai"
  const mW = s.match(/^(?:(?:spent|spend|paid|pay|bought|buy|got)\s+)?(.+?)\s+(?:on|for)\s+(.+)$/)
  if (mW) {
    const amount = parseNumber(mW[1])
    if (amount) return buildExpense(amount, mW[2].trim(), raw, 'medium')
  }

  return null
}

function buildExpense(amount: number, desc: string, raw: string, baseConf: Confidence): ParsedAction | null {
  if (!desc || amount <= 0 || amount > 1_000_000) return null
  const { name: category_name, matched } = keywordToCategory(desc)
  const confidence: Confidence = !matched && baseConf === 'high' ? 'medium' : baseConf
  return { kind: 'expense', amount, description: capFirst(desc), category_name, confidence, raw }
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseVoice(transcript: string): ParsedAction {
  const raw = transcript.trim()
  const s   = raw.toLowerCase().replace(/\s+/g, ' ').trim()

  // Order matters: most specific patterns first
  const action =
    trySpendingQuery(raw, s) ??
    tryReminder(raw, s)      ??
    tryAttendance(raw, s)    ??
    tryExam(raw, s)          ??
    tryAssignment(raw, s)    ??
    tryIncome(raw, s)        ??
    tryExpense(raw, s)

  return action ?? { kind: 'unknown', reason: 'No pattern matched. Try: "Spent 150 on lunch"', raw }
}

// ─── Spending date ranges (used server-side in voice.ts) ─────────────────────

export function getSpendingDateRange(
  range: SpendingRange,
  now: Date,
): { start: Date; end: Date; label: string } {
  switch (range) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), label: 'Today' }
    case 'yesterday': {
      const y = addDays(now, -1)
      return { start: startOfDay(y), end: endOfDay(y), label: 'Yesterday' }
    }
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end:   endOfWeek(now,   { weekStartsOn: 1 }),
        label: 'This week',
      }
    case 'last_week': {
      const lw = addDays(now, -7)
      return {
        start: startOfWeek(lw, { weekStartsOn: 1 }),
        end:   endOfWeek(lw,   { weekStartsOn: 1 }),
        label: 'Last week',
      }
    }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'This month' }
    case 'last_month': {
      const lm = addMonths(now, -1)
      return { start: startOfMonth(lm), end: endOfMonth(lm), label: 'Last month' }
    }
  }
}

// ─── Display helpers (used in voice-modal.tsx) ────────────────────────────────

export function formatVoiceDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatVoiceDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function spendingRangeLabel(range: SpendingRange): string {
  const MAP: Record<SpendingRange, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This week',
    last_week: 'Last week',
    month: 'This month',
    last_month: 'Last month',
  }
  return MAP[range]
}
