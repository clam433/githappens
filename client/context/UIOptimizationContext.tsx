// context/UIOptimizationContext.tsx
"use client"

import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from "react"
import { useSearchParams } from "next/navigation"

export type ShopperType =
  | "hesitancy"
  | "priceSensitive"
  | "researcher"
  | "decisive"
  | "engagement"
  | "unknown"

interface UIOptimizationState {
  shopperType: ShopperType
  setShopperType: (t: ShopperType) => void
  forcedType: ShopperType | null

  freeShippingThresholdEnabled: boolean
  freeShippingThreshold: number
  comboDealsEnabled: boolean
  lowStockAlertEnabled: boolean
}

const UIOptimizationContext = createContext<UIOptimizationState | undefined>(undefined)

const FREE_SHIPPING_THRESHOLD = 25
const ALLOWED: ShopperType[] = ["hesitancy", "priceSensitive", "researcher", "decisive", "engagement", "unknown"]

function featuresForType(type: ShopperType) {
  switch (type) {
    case "decisive":
      return { freeShipping: false, combo: true, lowStock: false }
    case "hesitancy":
      return { freeShipping: true, combo: false, lowStock: false }
    case "priceSensitive":
      return { freeShipping: true, combo: true, lowStock: false }
    case "researcher":
      return { freeShipping: false, combo: false, lowStock: false }
    case "engagement":
      return { freeShipping: false, combo: false, lowStock: true }
    default:
      return { freeShipping: false, combo: false, lowStock: false }
  }
}

export function UIOptimizationProvider({ children }: { children: ReactNode }) {
  const [shopperType, setShopperType] = useState<ShopperType>("unknown")
  const [forcedType, setForcedType] = useState<ShopperType | null>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    const t = searchParams.get("type")
    if (t && ALLOWED.includes(t as ShopperType)) setForcedType(t as ShopperType)
    else setForcedType(null)
  }, [searchParams])

  const activeType = forcedType ?? shopperType
  const derived = useMemo(() => featuresForType(activeType), [activeType])

  return (
    <UIOptimizationContext.Provider
      value={{
        shopperType: activeType,
        setShopperType,
        forcedType,
        freeShippingThresholdEnabled: derived.freeShipping,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        comboDealsEnabled: derived.combo,
        lowStockAlertEnabled: derived.lowStock,
      }}
    >
      {children}
    </UIOptimizationContext.Provider>
  )
}

export function useUIOptimization() {
  const context = useContext(UIOptimizationContext)
  if (!context) throw new Error("useUIOptimization must be used within a UIOptimizationProvider")
  return context
}
