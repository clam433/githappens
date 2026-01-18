"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { liveEventBus } from "@/lib/liveEventBus";

interface UIOptimizationState {
    freeShippingThresholdEnabled: boolean;
    toggleFreeShippingThreshold: () => void;
    freeShippingThreshold: number;
    comboDealsEnabled: boolean;
    toggleComboDeals: () => void;
    lowStockAlertEnabled: boolean;
    toggleLowStockAlert: () => void;
    resetAI: () => void; // Added resetAI to the interface
}

const UIOptimizationContext = createContext<UIOptimizationState | undefined>(undefined);

const FREE_SHIPPING_THRESHOLD = 25;

interface OptimizationState {
    freeShipping: boolean;
    comboDeals: boolean;
    lowStock: boolean;
    hasApplied: boolean;
}

const INITIAL_STATE: OptimizationState = {
    freeShipping: false,
    comboDeals: false,
    lowStock: false,
    hasApplied: false,
};

export function UIOptimizationProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<OptimizationState>(INITIAL_STATE);

    // Initial load and sync
    useEffect(() => {
        // Expose globally for F12 console debugging
        if (typeof window !== 'undefined') {
            (window as any).__EVENT_BUS__ = liveEventBus;
        }

        const syncState = () => {
            const saved = localStorage.getItem('behavioral_optimizations');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    // Critical: Use functional update to avoid stale closures
                    setState(prev => ({
                        ...prev,
                        freeShipping: !!data.freeShipping,
                        comboDeals: !!data.comboDeals,
                        lowStock: !!data.lowStock,
                        hasApplied: true
                    }));
                } catch (e) { }
            } else {
                setState(INITIAL_STATE);
            }
        };

        syncState();
        window.addEventListener('storage', syncState);

        // Debug helper
        (window as any).__AMPLIFY_DEBUG__ = {
            getState: () => state,
            reset: () => {
                localStorage.removeItem('behavioral_optimizations');
                syncState();
            },
            testSurgical: () => {
                const newState = { ...INITIAL_STATE, comboDeals: true, hasApplied: true };
                setState(newState);
                localStorage.setItem('behavioral_optimizations', JSON.stringify(newState));
            }
        };

        return () => window.removeEventListener('storage', syncState);
    }, []);

    // Save state whenever it flips to TRUE
    useEffect(() => {
        if (state.hasApplied) {
            localStorage.setItem('behavioral_optimizations', JSON.stringify(state));
        }
    }, [state]);

    const resetAI = () => {
        localStorage.removeItem('behavioral_optimizations');
        window.location.reload();
    };

    useEffect(() => {
        const unsubscribe = liveEventBus.subscribe((event) => {
            if (event.eventType === 'profile_update') {
                // 1. Extract values
                const props = (event.properties || {}) as any;
                const archetype = String(props.type || props.current_archetype || "").toLowerCase();
                const rawConfidence = props.confidence ?? props.confidence_score ?? 0;
                const confidence = Number(rawConfidence);
                const traits = (props.traits || []) as number[];
                const hesitancy = Number(traits[0] || 0);
                const decision = Number(traits[3] || 0);

                console.log("📡 UI Optimization: Tracking Signal", { eventType: event.eventType, archetype, confidence, hesitancy, decision, traits });

                // IMPORTANT: Logic gate
                if (state.hasApplied) return;

                // Trigger based on individual engagement signals (metrics), not overall confidence
                // Check if any metric has reached 80% threshold
                const hesitancyTriggered = hesitancy >= 80;
                const decisionTriggered = decision >= 80;
                const researchTriggered = (traits[2] || 0) >= 80;
                const priceTriggered = (traits[1] || 0) >= 80;
                const engagementTriggered = (traits[4] || 0) >= 80;

                const shouldTrigger = hesitancyTriggered || decisionTriggered || researchTriggered || priceTriggered || engagementTriggered;

                if (shouldTrigger) {
                    console.log("🚀 UI OPTIMIZATION TRIGGERED BY METRIC", {
                        hesitancyTriggered,
                        decisionTriggered,
                        researchTriggered,
                        priceTriggered,
                        engagementTriggered,
                        archetype
                    });

                    // Determine which UI change based on which metric triggered
                    let uiChange = "";
                    if (hesitancyTriggered || archetype.match(/hesitant|researcher/i)) {
                        setState({ ...INITIAL_STATE, freeShipping: true, hasApplied: true });
                        uiChange = "Free Shipping";
                        console.log("✅ STATE UPDATED: Free Shipping = true");
                    }
                    else if (decisionTriggered || archetype.match(/surgical|buyer|decisive|ninja/i)) {
                        setState({ ...INITIAL_STATE, comboDeals: true, hasApplied: true });
                        uiChange = "Combo Deals";
                        console.log("✅ STATE UPDATED: Combo Deals = true");
                    }
                    else if (priceTriggered) {
                        setState({ ...INITIAL_STATE, lowStock: true, hasApplied: true });
                        uiChange = "Low Stock Alert";
                        console.log("✅ STATE UPDATED: Low Stock Alert = true");
                    }
                    else {
                        setState({ ...INITIAL_STATE, lowStock: true, hasApplied: true });
                        uiChange = "Low Stock Alert";
                        console.log("✅ STATE UPDATED: Low Stock Alert = true (default)");
                    }

                    // Notify the narration system about the UI change
                    liveEventBus.push('ui_optimization_triggered', {
                        uiChange,
                        archetype,
                        confidence,
                        triggerMetric: hesitancyTriggered ? "Hesitancy" : decisionTriggered ? "Decision" : researchTriggered ? "Research" : priceTriggered ? "Price Sense" : "Engagement"
                    });
                }
            }
        });

        return unsubscribe;
    }, [state.hasApplied]);

    // Debug logging for state changes
    useEffect(() => {
        console.log("🔄 UI Optimization State Changed:", {
            freeShipping: state.freeShipping,
            comboDeals: state.comboDeals,
            lowStock: state.lowStock,
            hasApplied: state.hasApplied
        });
    }, [state]);

    return (
        <UIOptimizationContext.Provider
            value={{
                freeShippingThresholdEnabled: state.freeShipping,
                toggleFreeShippingThreshold: () => setState(s => ({ ...s, freeShipping: !s.freeShipping })),
                freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
                comboDealsEnabled: state.comboDeals,
                toggleComboDeals: () => setState(s => ({ ...s, comboDeals: !s.comboDeals })),
                lowStockAlertEnabled: state.lowStock,
                toggleLowStockAlert: () => setState(s => ({ ...s, lowStock: !s.lowStock })),
                resetAI,
            }}
        >
            {children}
        </UIOptimizationContext.Provider>
    );
}

export function useUIOptimization() {
    const context = useContext(UIOptimizationContext);
    if (!context) {
        throw new Error("useUIOptimization must be used within a UIOptimizationProvider");
    }
    return context;
}


