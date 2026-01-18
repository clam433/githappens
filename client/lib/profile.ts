// lib/profile.ts

type Row = Record<string, string | number>

export interface ShopperProfile {
  type: "Confident Shopper" | "Non-Confident Shopper"
  traits: number[] // [Hesitancy, Price Sense, Research, Decision, Engagement]
  confidence: number
  signals: string[]
  incentive: string
  incentiveReason: string
  sessionId: string
  timeOnSite: string
  signalsDetected: number
  lastBehavior: string
}

function num(v: any) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n))
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}m ${String(s).padStart(2, "0")}s`
}

function pickAllUsersRow(rows: Row[]): Row | undefined {
  const r = rows.find((x) => String(x["Segment"] ?? "").toLowerCase() === "all users")
  return r ?? rows[0]
}

/**
 * Try to find the "latest" date-like column in a row by parsing keys as dates.
 * Falls back to "last non-Segment key".
 */
function pickLatestValueColumn(row: Row): string | null {
  const keys = Object.keys(row).filter((k) => k.toLowerCase() !== "segment")
  if (!keys.length) return null

  const parsed = keys
    .map((k) => ({ k, t: Date.parse(k) }))
    .filter((x) => Number.isFinite(x.t))

  if (parsed.length) {
    parsed.sort((a, b) => a.t - b.t)
    return parsed[parsed.length - 1].k
  }

  // fallback: just take last key (Amplitude often puts latest column last)
  return keys[keys.length - 1] ?? null
}

/**
 * Builds ONE profile (Confident vs Non-Confident) from:
 * - Avg Session Duration chart CSV
 * - Checkout Time distribution chart CSV
 */
export function buildSingleProfileFromCharts(input: {
  avgSession: { headers: string[]; rows: Row[] }
  checkout: { headers: string[]; rows: Row[] }
}): ShopperProfile {
  // -----------------------
  // Avg Session Duration
  // -----------------------
  const avgRow = pickAllUsersRow(input.avgSession.rows) ?? {}
  const latestCol = pickLatestValueColumn(avgRow)
  const avgSessionSec = latestCol ? num(avgRow[latestCol]) : 0
  const minutes = avgSessionSec / 60

  // -----------------------
  // Checkout Time buckets
  // -----------------------
  const checkoutRow = pickAllUsersRow(input.checkout.rows) ?? {}
  const total = num(checkoutRow["Total"])

  // Choose bucket with smallest starting seconds as "fast"
  const bucketKeys = Object.keys(checkoutRow).filter((k) => /\ds\s*-\s*\d+s/i.test(k))
  const parseStart = (k: string) => {
    const m = k.match(/(\d+)\s*s\s*-/i)
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY
  }
  const fastBucket = bucketKeys.sort((a, b) => parseStart(a) - parseStart(b))[0]
  const fastCount = fastBucket ? num(checkoutRow[fastBucket]) : 0
  const fastRatio = total > 0 ? fastCount / total : 0

  // -----------------------
  // Core scores
  // -----------------------
  const decision = clamp(Math.round(fastRatio * 100)) // 0..100
  const hesitancy = 100 - decision

  // If avgSessionSec is missing/0, fall back to a reasonable estimate
  // based on checkout activity so Engagement/Research never become 0.
  const hasSession = avgSessionSec > 0

  // Engagement: more time typically means more engagement (cap around 6 minutes)
  // If we don't have time, estimate engagement from checkout total
  const engagement = hasSession
    ? clamp(Math.round((minutes / 6) * 100)) // 6 minutes => 100
    : clamp(Math.round(Math.min(100, total * 8))) // total=10 => 80 etc.

  // Research: time suggests researching, BUT fast checkout suggests less research.
  // So research increases with time and decreases with decision.
  // If no time, approximate research as the inverse of decision (more hesitation => more "researchy").
  const research = hasSession
    ? clamp(Math.round((minutes / 7) * 100 - decision * 0.35)) // tuned
    : clamp(Math.round(60 - decision * 0.4 + 20)) // tuned fallback

  // Price Sense: you don’t have pricing data in these 2 charts, so keep neutral
  const priceSense = 40

  // -----------------------
  // Confidence score
  // -----------------------
  // confident = high decision + (not super long sessions)
  const durationPenalty = hasSession ? clamp(Math.round((minutes / 8) * 100)) : 40
  const timeScore = 100 - durationPenalty
  const confidenceScore = clamp(Math.round(0.75 * decision + 0.25 * timeScore))

  const type: ShopperProfile["type"] =
    confidenceScore >= 60 ? "Confident Shopper" : "Non-Confident Shopper"

  const timeOnSite = avgSessionSec ? formatTime(avgSessionSec) : "N/A"

  const signals: string[] = [
    `Fast checkout bucket: ${fastBucket ?? "N/A"} (${Math.round(fastRatio * 100)}%)`,
    `Avg session: ${timeOnSite}`,
    `Decision score: ${decision}/100`,
  ]

  const incentive =
    type === "Confident Shopper" ? "Priority Shipping" : "Risk-Free Returns"
  const incentiveReason =
    type === "Confident Shopper"
      ? "Reward high intent and reduce friction"
      : "Lower perceived risk and hesitation"

  return {
    type,
    traits: [hesitancy, priceSense, research, decision, engagement],
    confidence: confidenceScore,
    signals,
    incentive,
    incentiveReason,
    sessionId: "COHORT-LIVE",
    timeOnSite,
    signalsDetected: signals.length,
    lastBehavior: "Aggregate charts (no last event)",
  }
}
