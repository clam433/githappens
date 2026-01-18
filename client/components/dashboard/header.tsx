"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Settings, Truck, Package, AlertTriangle } from "lucide-react"
import { useUIOptimization } from "@/context/UIOptimizationContext"
import { liveEventBus } from "@/lib/liveEventBus"

export function Header() {
  const {
    freeShippingThresholdEnabled,
    comboDealsEnabled,
    lowStockAlertEnabled,
    toggleFreeShippingThreshold,
    toggleComboDeals,
    toggleLowStockAlert
  } = useUIOptimization();

  const resetOptimizations = () => {
    localStorage.removeItem('behavioral_optimizations');
    window.location.reload();
  };

  const testTrigger = () => {
    // Manually push a mock confirmed event to the bus
    liveEventBus.push('profile_update', {
      type: "Surgical Buyer",
      confidence: 100,
      is_confirmed: true,
      traits: [10, 10, 10, 95, 80],
      next_best_action: "Flash Sale applied"
    });
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success mr-2 animate-pulse" />
          Live
        </Badge>
        <span className="text-sm text-muted-foreground">Behavioral Detective Active</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Behavioral Toggles (Indicator Style) */}
        <div className="flex items-center gap-2 mr-4 border-r border-border pr-4">
          <div className="flex flex-col gap-1 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetOptimizations}
              className="h-6 text-[9px] px-2 uppercase tracking-tighter text-muted-foreground hover:text-red-400"
            >
              Reset AI
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={testTrigger}
              className="h-6 text-[9px] px-2 uppercase tracking-tighter text-cyan-400 hover:text-cyan-300"
            >
              Test Trigger
            </Button>
          </div>

          <div
            title="Free Shipping Triggered"
            className={`p-1.5 rounded-full transition-all duration-500 ${freeShippingThresholdEnabled ? "bg-primary/20 text-primary scale-110 shadow-[0_0_15px_rgba(var(--primary),0.3)] animate-pulse" : "text-muted-foreground/20"}`}
          >
            <Truck className="w-4 h-4" />
          </div>
          <div
            title="Combo Deals Triggered"
            className={`p-1.5 rounded-full transition-all duration-500 ${comboDealsEnabled ? "bg-amber-500/20 text-amber-500 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse" : "text-muted-foreground/20"}`}
          >
            <Package className="w-4 h-4" />
          </div>
          <div
            title="Low Stock Triggered"
            className={`p-1.5 rounded-full transition-all duration-500 ${lowStockAlertEnabled ? "bg-red-500/20 text-red-500 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "text-muted-foreground/20"}`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
