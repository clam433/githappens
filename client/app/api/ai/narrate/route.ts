import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
**Role & Persona**
You are the **Anti-Gravity Behavioral Detective**.
**Goal:** Narrate the *psychological reasoning* behind every user action in real-time. Do not just report the news; explain *why* it matters for the profile.

### ⚡ LIVE NARRATION RULES (The "Why" Engine)
For every event, generate a concise "Logic Chain" analysis (Exactly 1 sentence).
**Format:** \`[Observation] -> [Deduction] -> [Profile Impact]\`
Use Emojis at the start.

**Examples of "Reasoning" Narration:**
* "📉 Budget Signal: Removing the most expensive item suggests a strict price cap, confirming Price Optimizer tendencies."
* "⏱️ Hesitation: 15 seconds on checkout without submission indicates Cold Feet and spikes the Hesitancy Score by +20."
* "🔍 Deep Research: Third view of the same product signals thorough comparison behavior, elevating Research score."
* "⚡ Quick Decision: Adding to cart within 5 seconds shows Surgical Buyer confidence."

### 🔍 DEDUCTION FRAMEWORK
1.  **Hesitant Researcher:** (Repeated views, slow checkout). Trigger: "Hesitant Researcher suspected."
2.  **Surgical Buyer:** (Fast, linear path to purchase). Trigger: "Confirmed Surgical Buyer."
3.  **Price Optimizer / Window Shopper:** (Cart grooming, pricing sorts). Trigger: "Price Optimizer detected."

**Trigger Mapping Rules:**
*   Confirmed **Hesitant Researcher** -> Enable **Free Shipping**.
*   Confirmed **Surgical Buyer** -> Enable **Combo Deals**.
*   Confirmed **Other** (Price/Window) -> Enable **Low Stock Alert**.

### 🔒 CONFIDENCE PROTOCOL
* **Confidence < 80%:** Status is **"Suspecting"**.
* **Confidence >= 80%:** Status is **"CONFIRMED"**.

### 📊 SCORE RULES
* Scores are CUMULATIVE and can ONLY INCREASE, never decrease.
* Each new interaction should ADD to existing scores, not replace them.
* Minimum score for any metric is the previous value.
* **IMPORTANT:** Meaningful interactions should cause SIGNIFICANT increases (25-50% boost), not tiny increments.
* Examples of significant boosts:
  - Viewing a product: +65-75 to Research
  - Adding to cart: +40-50 to Decision
  - Repeated views: +30-40 to Hesitancy
  - Navigation between products: +25-35 to Engagement
  - Price comparisons: +30-40 to Price Sense

### OUTPUT FORMAT (JSON ONLY)
{
  "live_narration": "String (Exactly 1 sentence. Use format: [Observation] -> [Deduction] -> [Profile Impact])",
  "current_archetype": "String",
  "status": "String ('Suspecting' or 'CONFIRMED')",
  "confidence": Integer (0-100),
  "is_confirmed": Boolean (True if confidence >= 80),
  "scores": {
    "hesitancy": Int,
    "price_sense": Int,
    "research": Int,
    "decision": Int,
    "engagement": Int
  },
  "next_best_action": "String (Short strategic incentive/action based on the profile)"
}
`;

export async function POST(req: Request) {
    console.log("AI Agent: Received request (Gemini Mode)");

    const apiKey = process.env.GEMINI_API_KEY;

    console.log("AI Agent: Configuration", {
        model: "gemini-2.0-flash-exp",
        hasKey: !!apiKey
    });

    if (!apiKey) {
        return NextResponse.json({
            live_narration: "⚠️ AI Offline: Missing Gemini API Key.",
            current_archetype: "Unknown",
            status: "Error",
            confidence: 0,
            scores: { hesitancy: 10, price_sense: 10, research: 10, decision: 10, engagement: 10 }
        });
    }

    try {
        const body = await req.json();
        const { event, shopperState } = body;

        const prompt = `
        CURRENT EVENT: ${JSON.stringify(event)}
        
        CUMULATIVE SHOPPER STATE:
        ${JSON.stringify(shopperState)}
        
        CRITICAL SCORING RULES:
        Current scores are:
        - Hesitancy: ${shopperState.hesitationCount || 0}
        - Price Sense: ${shopperState.priceComparisons || 0}
        - Research: ${shopperState.viewedProducts?.size || 0}
        - Decision: ${shopperState.cartItems || 0}
        - Engagement: ${shopperState.totalInteractions || 0}
        
        Current confidence: ${shopperState.confidence || 0}%
        
        MANDATORY CUMULATIVE RULES FOR ALL 5 METRICS:
        1. EVERY score you return MUST be >= the current value shown above
        2. For relevant metrics to this action, ADD your boost to the current value
        3. For non-relevant metrics, return AT LEAST the current value (no decrease allowed)
        
        Example calculation for a product view:
        - Research: ${shopperState.viewedProducts?.size || 0} + 65 = ${(shopperState.viewedProducts?.size || 0) + 65}
        - Engagement: ${shopperState.totalInteractions || 0} + 25 = ${(shopperState.totalInteractions || 0) + 25}
        - Hesitancy: ${shopperState.hesitationCount || 0} (unchanged, return current value)
        - Price Sense: ${shopperState.priceComparisons || 0} (unchanged, return current value)
        - Decision: ${shopperState.cartItems || 0} (unchanged, return current value)
        
        CONFIDENCE RULES:
        - Current confidence is ${shopperState.confidence || 0}%
        - Each meaningful interaction should increase confidence by 5-15%
        - Example: If confidence is 75%, return 80-90% (75 + 5-15)
        - Maximum confidence is 95% (cap at this value, never exceed)
        - DO NOT return the same confidence value twice in a row
        - CRITICAL: When confidence reaches 80% or higher, you MUST set "is_confirmed": true in your response
        
        Analyze this interaction and return updated scores with increased confidence.
        `;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: prompt }
        ]);

        const response = result.response;
        const text = response.text();

        console.log("AI Agent: Success", text?.substring(0, 50) + "...");

        if (!text) throw new Error("Empty response from Gemini");

        return new NextResponse(text, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("AI Agent: Critical Failure", {
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json({
            live_narration: "❌ Analysis failed: " + (error.message || "Unknown error"),
            current_archetype: "Analytic Error",
            status: "Error",
            confidence: 0,
            scores: { hesitancy: 10, price_sense: 10, research: 10, decision: 10, engagement: 10 },
            debug_error: error.message
        }, { status: 500 });
    }
}
