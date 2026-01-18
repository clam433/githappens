"use client"

import { useEffect, useState } from "react"
import { AnimatedRadarChart } from "./animated-radar-chart"
import { Activity, Zap, Clock, MousePointer, ChevronRight } from "lucide-react"
import { parseAmplitudeCsv } from "@/lib/parseCsv"
import { buildSingleProfileFromCharts } from "@/lib/profile"

interface ShopperProfile {
  type: "Confident Shopper" | "Non-Confident Shopper"
  traits: number[]
  confidence: number
  signals: string[]
  incentive: string
  incentiveReason: string
  sessionId: string
  timeOnSite: string
  signalsDetected: number
  lastBehavior: string
}

const TRAIT_LABELS = ["Hesitancy", "Price Sense", "Research", "Decision", "Engagement"]

export function LiveShopperProfiler() {
  const [profile, setProfile] = useState<ShopperProfile | null>(null)
  const [isMorphing, setIsMorphing] = useState(false)
  const [showDetails, setShowDetails] = useState(true)
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    async function load() {
      try {
        setIsMorphing(true)
        setShowDetails(false)

        const AVG_SESSION_CHART_ID = "qkrahmgz"
        const CHECKOUT_TIME_CHART_ID = "1tvzngd9"

        const [avgCsv, checkoutCsv] = await Promise.all([
          fetch(`/api/amplitude/chart/${AVG_SESSION_CHART_ID}/csv`, { cache: "no-store" }).then((r) => r.text()),
          fetch(`/api/amplitude/chart/${CHECKOUT_TIME_CHART_ID}/csv`, { cache: "no-store" }).then((r) => r.text()),
        ])

        const avgParsed = parseAmplitudeCsv(avgCsv)
        const checkoutParsed = parseAmplitudeCsv(checkoutCsv)

        const computed = buildSingleProfileFromCharts({
          avgSession: avgParsed,
          checkout: checkoutParsed,
        })

        setProfile(computed)
      } catch (e) {
        console.error("Profiler load failed:", e)
        setProfile(null)
      } finally {
        setTimeout(() => {
          setIsMorphing(false)
          setShowDetails(true)
        }, 800)
      }
    }

    load()
  }, [])

  const currentProfile = profile

  if (!currentProfile) {
    return <div className="w-full h-full bg-black text-zinc-300 p-4">Loading profile…</div>
  }

  const getStatusColor = (confidence: number) => {
    if (confidence >= 90) return "bg-emerald-500"
    if (confidence >= 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Main content */}
      <div className="relative w-full h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isMorphing ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"}`} />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                {isMorphing ? "Analyzing" : "Live"}
              </span>
            </div>
          </div>

          {/* single status dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>

        {/* Main grid layout */}
        <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-3 p-4 min-h-0">
          {/* Left Panel - Session Context */}
          <div
            className="col-span-3 row-span-4 flex flex-col gap-3 transition-opacity duration-500"
            style={{ opacity: showDetails ? 1 : 0.3 }}
          >
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-800/50 rounded-lg p-4 flex-1">
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">Session Context</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800/50 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Session ID</p>
                    <p className="text-sm font-mono text-zinc-300">{currentProfile.sessionId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800/50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Signals</p>
                    <p className="text-sm font-mono text-zinc-300">{currentProfile.signalsDetected} detected</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800/50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Time on Site</p>
                    <p className="text-sm font-mono text-zinc-300">{currentProfile.timeOnSite}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800/50 flex items-center justify-center">
                    <MousePointer className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Last Action</p>
                    <p className="text-sm text-zinc-300">{currentProfile.lastBehavior}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Radar */}
          <div className="col-span-6 row-span-5 flex items-center justify-center relative">
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, rgba(0, 255, 255, 0.03) 0%, transparent 60%)`,
              }}
            />
            <div className="w-full h-full max-w-[500px] max-h-[500px] aspect-square">
              <AnimatedRadarChart data={currentProfile.traits} labels={TRAIT_LABELS} isMorphing={isMorphing} />
            </div>
          </div>

          {/* Right Top - Status */}
          <div className="col-span-3 row-span-2 transition-opacity duration-500" style={{ opacity: showDetails ? 1 : 0.3 }}>
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-800/50 rounded-lg p-4 h-full">
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Profile Status</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(currentProfile.confidence)}`} />
                    <span className="text-xs font-mono text-emerald-400">Active</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Confidence</span>
                    <span className="text-xs font-mono text-cyan-400">{currentProfile.confidence}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${currentProfile.confidence}%` }}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs text-zinc-500">Type</span>
                  <p className="text-sm font-medium text-zinc-200 mt-0.5">{currentProfile.type}</p>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(currentProfile.confidence)}`} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Middle - Trait bars */}
          <div className="col-span-3 row-span-2 transition-opacity duration-500" style={{ opacity: showDetails ? 1 : 0.3 }}>
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-800/50 rounded-lg p-4 h-full">
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Engagement Signals</h3>

              <div className="space-y-2.5">
                {TRAIT_LABELS.map((label, i) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-500">{label}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{currentProfile.traits[i]}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${currentProfile.traits[i]}%`,
                          background:
                            currentProfile.traits[i] > 70
                              ? "linear-gradient(90deg, #22d3ee, #14b8a6)"
                              : currentProfile.traits[i] > 40
                                ? "linear-gradient(90deg, #a78bfa, #8b5cf6)"
                                : "linear-gradient(90deg, #52525b, #3f3f46)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Bottom - Recommended Action */}
          <div className="col-span-3 row-span-2 transition-opacity duration-500" style={{ opacity: showDetails ? 1 : 0.3 }}>
            <div className="bg-zinc-900/40 backdrop-blur border border-cyan-900/30 rounded-lg p-4 h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 relative">
                Recommended Adaptation
              </h3>

              <div className="space-y-3 relative">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-cyan-400">{currentProfile.incentive}</p>
                    <p className="text-xs text-zinc-500 mt-1">{currentProfile.incentiveReason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: "78%" }} />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">+78% lift</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Left - Signal Log */}
          <div className="col-span-3 row-span-2 transition-opacity duration-500" style={{ opacity: showDetails ? 1 : 0.3 }}>
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-800/50 rounded-lg p-4 h-full">
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Signal Log</h3>

              <div className="space-y-2">
                {currentProfile.signals.map((signal, i) => (
                  <div key={`${currentProfile.type}-${i}`} className="flex items-center gap-2 text-xs transition-all duration-300">
                    <div className="w-1 h-1 rounded-full bg-cyan-400" />
                    <span className="text-zinc-400">{signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Center - Command Input */}
          <div className="col-span-6 row-span-1 flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask why this shopper looks this way..."
                  className="w-full bg-zinc-900/60 backdrop-blur border border-zinc-800/50 rounded-lg px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-800/50 focus:ring-1 focus:ring-cyan-800/30 font-mono"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors">
                  Focus Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
