"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"

// ─────────────────────────────────────────────────────────────
// Event Emitter for cross-context communication
// ─────────────────────────────────────────────────────────────

type ShopperEventType = "store_visited" | "cart_action" | "checkout_started" | "checkout_finished"
type ShopperEventPayload = { type: ShopperEventType; total?: number }
type ShopperEventListener = (event: ShopperEventPayload) => void

const listeners: Set<ShopperEventListener> = new Set()

export const shopperEvents = {
  emit: (event: ShopperEventPayload) => {
    listeners.forEach((listener) => listener(event))
  },
  subscribe: (listener: ShopperEventListener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ShopperMetrics = {
  storeVisitedAt?: number
  checkoutStartedAt?: number
  checkoutFinishedAt?: number
  timeOnCheckout?: number
  totalAtPurchase?: number
  cartActions?: number
}

export type ShopperTraits = {
  decisionVelocity: number
  hesitancy: number
  priceSensitivity: number
  engagement: number
  purchaseConfidence: number
}

type ShopperMetricsContextValue = {
  metrics: ShopperMetrics
  traits: ShopperTraits
  trackStoreVisited: () => void
  trackCheckoutStarted: (total?: number) => void
  trackCheckoutFinished: (totalAmount: number) => void
  trackCartAction: () => void
  resetMetrics: () => void
}

// ─────────────────────────────────────────────────────────────
// Trait Computation
// ─────────────────────────────────────────────────────────────

function computeTraits(metrics: ShopperMetrics): ShopperTraits {
  const now = Date.now()

  // Decision Velocity: time from store visit to checkout start
  let decisionVelocity = 50
  if (metrics.storeVisitedAt && metrics.checkoutStartedAt) {
    const decisionTimeMs = metrics.checkoutStartedAt - metrics.storeVisitedAt
    const decisionTimeSec = decisionTimeMs / 1000
    decisionVelocity = Math.max(0, Math.min(100, 100 - ((decisionTimeSec - 30) / 270) * 100))
  } else if (metrics.storeVisitedAt && !metrics.checkoutStartedAt) {
    const browsingTime = (now - metrics.storeVisitedAt) / 1000
    decisionVelocity = Math.max(20, 80 - (browsingTime / 60) * 15)
  }

  // Hesitancy: time spent on checkout page
  let hesitancy = 20
  if (metrics.timeOnCheckout) {
    const checkoutTimeSec = metrics.timeOnCheckout / 1000
    hesitancy = Math.min(100, (checkoutTimeSec / 180) * 100)
  } else if (metrics.checkoutStartedAt && !metrics.checkoutFinishedAt) {
    const timeOnCheckout = (now - metrics.checkoutStartedAt) / 1000
    hesitancy = Math.min(100, (timeOnCheckout / 180) * 100)
  }

  // Price Sensitivity
  let priceSensitivity = 40
  if (metrics.totalAtPurchase !== undefined) {
    if (metrics.totalAtPurchase < 50) {
      priceSensitivity = 80 + (1 - metrics.totalAtPurchase / 50) * 20
    } else if (metrics.totalAtPurchase < 200) {
      priceSensitivity = 40 + (1 - (metrics.totalAtPurchase - 50) / 150) * 40
    } else {
      priceSensitivity = Math.max(0, 40 - (metrics.totalAtPurchase - 200) / 50 * 10)
    }
    priceSensitivity = Math.min(100, priceSensitivity + hesitancy * 0.2)
  } else if (metrics.checkoutStartedAt) {
    priceSensitivity = 50 + hesitancy * 0.3
  }

  // Engagement
  let engagement = 0
  if (metrics.storeVisitedAt) engagement = 30
  if (metrics.cartActions) {
    engagement += Math.min(25, metrics.cartActions * 5)
  }
  if (metrics.checkoutStartedAt) engagement = Math.max(engagement, 65)
  if (metrics.checkoutFinishedAt) engagement = 100

  // Purchase Confidence
  let purchaseConfidence = 20
  if (metrics.storeVisitedAt) purchaseConfidence = 35
  if (metrics.checkoutStartedAt) purchaseConfidence = 55
  if (metrics.checkoutFinishedAt) purchaseConfidence = 95

  return {
    decisionVelocity: Math.round(decisionVelocity),
    hesitancy: Math.round(hesitancy),
    priceSensitivity: Math.round(priceSensitivity),
    engagement: Math.round(engagement),
    purchaseConfidence: Math.round(purchaseConfidence),
  }
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const ShopperMetricsContext = createContext<ShopperMetricsContextValue | null>(null)

export function ShopperMetricsProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<ShopperMetrics>({})

  // Track store_page_visited
  const trackStoreVisited = useCallback(() => {
    setMetrics((prev) => {
      if (prev.storeVisitedAt) return prev
      return { ...prev, storeVisitedAt: Date.now() }
    })
  }, [])

  // Track checkout_started
  const trackCheckoutStarted = useCallback((total?: number) => {
    const timestamp = Date.now()
    setMetrics((prev) => ({
      ...prev,
      checkoutStartedAt: timestamp,
      ...(total !== undefined && { totalAtPurchase: total }),
    }))
  }, [])

  // Track checkout_finished
  const trackCheckoutFinished = useCallback((totalAmount: number) => {
    const timestamp = Date.now()
    setMetrics((prev) => {
      const timeOnCheckout = prev.checkoutStartedAt
        ? timestamp - prev.checkoutStartedAt
        : undefined
      return {
        ...prev,
        checkoutFinishedAt: timestamp,
        timeOnCheckout,
        totalAtPurchase: totalAmount,
      }
    })
  }, [])

  // Track cart actions
  const trackCartAction = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      cartActions: (prev.cartActions || 0) + 1,
      storeVisitedAt: prev.storeVisitedAt || Date.now(),
    }))
  }, [])

  // Reset for new session
  const resetMetrics = useCallback(() => {
    setMetrics({})
  }, [])

  // Listen for events from other contexts
  useEffect(() => {
    const unsubscribe = shopperEvents.subscribe((event) => {
      switch (event.type) {
        case "store_visited":
          setMetrics((prev) => {
            if (prev.storeVisitedAt) return prev
            return { ...prev, storeVisitedAt: Date.now() }
          })
          break
        case "cart_action":
          setMetrics((prev) => ({
            ...prev,
            cartActions: (prev.cartActions || 0) + 1,
            storeVisitedAt: prev.storeVisitedAt || Date.now(),
          }))
          break
        case "checkout_started":
          setMetrics((prev) => ({
            ...prev,
            checkoutStartedAt: Date.now(),
            storeVisitedAt: prev.storeVisitedAt || Date.now(),
            ...(event.total !== undefined && { totalAtPurchase: event.total }),
          }))
          break
        case "checkout_finished":
          setMetrics((prev) => {
            const timestamp = Date.now()
            const timeOnCheckout = prev.checkoutStartedAt
              ? timestamp - prev.checkoutStartedAt
              : undefined
            return {
              ...prev,
              checkoutFinishedAt: timestamp,
              timeOnCheckout,
              ...(event.total !== undefined && { totalAtPurchase: event.total }),
            }
          })
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Derive traits from metrics
  const traits = useMemo(() => computeTraits(metrics), [metrics])

  const value: ShopperMetricsContextValue = {
    metrics,
    traits,
    trackStoreVisited,
    trackCheckoutStarted,
    trackCheckoutFinished,
    trackCartAction,
    resetMetrics,
  }

  return (
    <ShopperMetricsContext.Provider value={value}>
      {children}
    </ShopperMetricsContext.Provider>
  )
}

export function useShopperMetrics() {
  const context = useContext(ShopperMetricsContext)
  if (!context) {
    throw new Error("useShopperMetrics must be used within a ShopperMetricsProvider")
  }
  return context
}

export { computeTraits }
