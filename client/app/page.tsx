// app/page.tsx
"use client"

import { useEffect, useState } from "react"
import { AmplifyParticles } from "@/components/intro/amplify-particles"
import { products } from "@/lib/products"
import { ProductGrid } from "@/components/products/ProductGrid"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { FreeShippingBar } from "@/components/shop/FreeShippingBar"
import { useUIOptimization } from "@/context/UIOptimizationContext"
import { classifyShopper } from "@/lib/shopperType"

export default function Home() {
  const [showIntro, setShowIntro] = useState(true)
  const [mounted, setMounted] = useState(false)

  const { freeShippingThresholdEnabled, setShopperType, forcedType } = useUIOptimization()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    if (forcedType) return

    // placeholder until you wire Amplitude CSV metrics
    const metrics = {
      avgCheckoutTimeSec: Number(localStorage.getItem("avgCheckoutTimeSec") ?? 0),
      visits: Number(localStorage.getItem("visits") ?? 0),
      purchases: Number(localStorage.getItem("purchases") ?? 0),
      avgPrice: Number(localStorage.getItem("avgPrice") ?? 0),
      clicks: Number(localStorage.getItem("clicks") ?? 0),
    }

    const type = classifyShopper(metrics)
    setShopperType(type)
  }, [mounted, forcedType, setShopperType])

  if (!mounted) return null
  if (showIntro) return <AmplifyParticles onComplete={() => setShowIntro(false)} />

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="ml-16 md:ml-56 pt-16 p-6">
        <div className="space-y-8">
          {freeShippingThresholdEnabled && <FreeShippingBar />}

          <section className="text-center py-8">
            <h1 className="text-4xl font-bold mb-4">
              Welcome to <span className="text-primary">UofTHacks 13</span> Shop!
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get your exclusive hackathon stickers. Limited edition designs from the best hackathon in Toronto! 🦌✨
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">All Stickers</h2>
              <span className="text-muted-foreground">{products.length} items</span>
            </div>
            <ProductGrid products={products} />
          </section>
        </div>
      </main>
    </div>
  )
}
