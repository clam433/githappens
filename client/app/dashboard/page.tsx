"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard"
// import { ProfileCard } from "@/components/dashboard/profile-scan/profile-card"
import { ShopperJourney } from "@/components/dashboard/shopper-journey"
import { IncentiveEngine } from "@/components/dashboard/incentive-engine"
import { FeedbackLoop } from "@/components/dashboard/feedback-loop"
import ChartCard from "@/components/dashboard/chart-card"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const charts = [
    {
      title: "Sessions and time on site",
      embedUrl: "https://app.amplitude.com/analytics/share/8e6da5c8732a48cd8c13eac1f716534b",
    },
    {
      title: "Page views and navigation",
      embedUrl: "https://app.amplitude.com/analytics/share/a51087d7d47645d1b07b6828e125b7a9",
    },
    {
      title: "Clicks and UI interactions",
      embedUrl: "https://app.amplitude.com/analytics/share/7e40c42027124fae8b7885f274f6bc4b",
    },
    {
      title: "Funnels and conversion",
      embedUrl: "https://app.amplitude.com/analytics/share/af6ff9a830d944398a5ce7997cb36846",
    },
    {
      title: "Pricing tier at time of event",
      embedUrl: "https://app.amplitude.com/analytics/share/4df13816c0da4ebe9b208e2691343827",
    },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <OverviewDashboard />

              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Analytics</h2>
                <p className="text-sm text-muted-foreground">
                  Pulled from your saved Amplitude charts.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {charts.map((c) => (
                  <ChartCard key={c.title} title={c.title} embedUrl={c.embedUrl} />
                ))}
              </div>
            </div>
          )}

          {activeTab === "journey" && <ShopperJourney />}
          {activeTab === "incentives" && <IncentiveEngine />}
          {activeTab === "feedback" && <FeedbackLoop />}
        </main>
      </div>
    </div>
  )
}
