// lib/shopperType.ts
export type ShopperType =
  | "hesitancy"
  | "priceSensitive"
  | "researcher"
  | "decisive"
  | "engagement"
  | "unknown"

export type ShopperMetrics = {
  avgCheckoutTimeSec?: number
  visits?: number
  purchases?: number
  avgPrice?: number
  clicks?: number
}

export function classifyShopper(metrics: ShopperMetrics): ShopperType {
  const visits = Number(metrics.visits ?? 0)
  const purchases = Number(metrics.purchases ?? 0)
  const avgCheckoutTime = Number(metrics.avgCheckoutTimeSec ?? 0)
  const avgPrice = Number(metrics.avgPrice ?? 0)
  const clicks = Number(metrics.clicks ?? 0)

  const conversion = visits > 0 ? purchases / visits : 0

  // Engagement: heavy interaction (put this early so it wins if they're super active)
  if (clicks >= 20) return "engagement"

  // Researcher: lots of browsing/clicking, no purchases yet
  if (visits >= 3 && clicks >= 10 && purchases === 0) return "researcher"

  // Decisive: high conversion and fast checkout
  if (conversion >= 0.25 && avgCheckoutTime > 0 && avgCheckoutTime <= 30) return "decisive"

  // Hesitancy: slow checkout and low conversion
  if (avgCheckoutTime >= 90 && conversion < 0.1) return "hesitancy"

  // Price sensitive: low average price and weak conversion (likely needs incentives)
  if (avgPrice > 0 && avgPrice <= 5 && conversion < 0.2) return "priceSensitive"

  return "unknown"
}
