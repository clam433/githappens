// components/layout/Header.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { ShoppingCart, Truck, Package, AlertTriangle } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { useUIOptimization, ShopperType } from "@/context/UIOptimizationContext"
import { parseAmplitudeCsv } from "@/lib/parseCsv"
import { buildSingleProfileFromCharts } from "@/lib/profile"

export function Header() {
  const { totalItems } = useCart()

  const {
    shopperType,
    setShopperType,
    forcedType,
    freeShippingThresholdEnabled,
    comboDealsEnabled,
    lowStockAlertEnabled,
  } = useUIOptimization()

  const activeType = forcedType ?? shopperType
  const [isMatching, setIsMatching] = useState(false);

  const setTypeFromToggle = (target: ShopperType) => {
    // if you click the same one again, reset to unknown
    if (activeType === target) setShopperType("unknown")
    else setShopperType(target)
  }

    // 👇 this is the important part
  const handleMatchPreferences = async () => {
    try {
      setIsMatching(true)

      const AVG_SESSION_CHART_ID = "qkrahmgz"
      const CHECKOUT_TIME_CHART_ID = "1tvzngd9"

      const [avgCsv, checkoutCsv] = await Promise.all([
        fetch(`/api/amplitude/chart/${AVG_SESSION_CHART_ID}/csv`, { cache: "no-store" }).then((r) => r.text()),
        fetch(`/api/amplitude/chart/${CHECKOUT_TIME_CHART_ID}/csv`, { cache: "no-store" }).then((r) => r.text()),
      ])

      const avgParsed = parseAmplitudeCsv(avgCsv)
      const checkoutParsed = parseAmplitudeCsv(checkoutCsv)

      const profile = buildSingleProfileFromCharts({
        avgSession: avgParsed,
        checkout: checkoutParsed,
      })

      // Map computed profile -> your UIOptimization types
      const detectedType: ShopperType =
        profile.type === "Confident Shopper" ? "decisive" : "hesitancy"

      setShopperType(detectedType) // ✅ this will toggle the right UI flags automatically
    } catch (err) {
      console.error("Match preferences failed:", err)
    } finally {
      setIsMatching(false)
    }
  }

  return (
    <header className="fixed top-0 left-16 md:left-56 right-0 h-16 glass z-40 flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold">Sticker Shop</h1>
        <p className="text-sm text-muted-foreground">UofTHacks 13 Merch</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Match Preferences */}
        <button
          onClick={handleMatchPreferences}
          disabled={isMatching}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
            ${isMatching ? "opacity-60 cursor-not-allowed" : ""}
            bg-secondary text-secondary-foreground hover:bg-secondary/80`}
          title="Match preferences"
        >
          <span className="hidden xl:inline">{isMatching ? "Matching..." : "Match Preferences"}</span>
        </button>

      <button
          onClick={() => setTypeFromToggle("hesitancy")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            freeShippingThresholdEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
          title="Hesitancy -> Free Shipping"
        >
          <Truck className="w-4 h-4" />
          <span className="hidden xl:inline">Free Shipping</span>
          <div className={`w-8 h-4 rounded-full transition-colors ${freeShippingThresholdEnabled ? "bg-primary-foreground/30" : "bg-muted"}`}>
            <div
              className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${
                freeShippingThresholdEnabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        <button
          onClick={() => setTypeFromToggle("decisive")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            comboDealsEnabled ? "bg-amber-500 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
          title="Decisive -> Combo Deals"
        >
          <Package className="w-4 h-4" />
          <span className="hidden xl:inline">Combo</span>
          <div className={`w-8 h-4 rounded-full transition-colors ${comboDealsEnabled ? "bg-white/30" : "bg-muted"}`}>
            <div
              className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${
                comboDealsEnabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        <button
          onClick={() => setTypeFromToggle("engagement")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            lowStockAlertEnabled ? "bg-red-500 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
          title="Engagement -> Low Stock"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="hidden xl:inline">Low Stock</span>
          <div className={`w-8 h-4 rounded-full transition-colors ${lowStockAlertEnabled ? "bg-white/30" : "bg-muted"}`}>
            <div
              className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${
                lowStockAlertEnabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* Optional tiny debug */}
        <div className="hidden lg:block text-xs text-muted-foreground ml-2">
          type:{activeType}
        </div>

        <Link href="/cart" className="relative p-2 rounded-lg hover:bg-secondary transition-colors ml-2">
          <ShoppingCart className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
