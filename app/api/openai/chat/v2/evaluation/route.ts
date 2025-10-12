import { NextRequest, NextResponse } from "next/server"
import { EvaluationInputSchema, EvaluationResponseSchema, isDebugEnabled } from "../_shared"
import { getModelConfig, ModelType } from "@/lib/models/config"
import { logReasoningEffortUsage, logAPIRequest, logAPIResponse } from "@/lib/monitoring/reasoning-effort"
import { buildEvaluationMessages } from "./prompts"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = EvaluationInputSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message = flat.formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ 
        error: message,
        details: flat.fieldErrors,
      }, { status: 400 })
    }

    const input = parsed.data
    const messages = buildEvaluationMessages(input)
    const modelConfig = getModelConfig(ModelType.EVALUATION)
    const model = modelConfig.model
    const reasoningEffort = modelConfig.reasoningEffort

    const requestBody: any = { 
      model, 
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    }
    
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort  // Will be "high"
    }

    // Log reasoning effort usage
    logReasoningEffortUsage('/api/openai/chat/v2/evaluation', reasoningEffort, model)
    logAPIRequest('/api/openai/chat/v2/evaluation', model, reasoningEffort, { 
      scenarioInfo: input.scenarioInfo?.title,
      chatHistoryLength: input.chatHistory?.length 
    })

    if (isDebugEnabled()) {
      console.log("[DEBUG] evaluation v2 request:", requestBody)
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "")
      return NextResponse.json({ error: `LLM provider error: ${resp.status} ${errText}` }, { status: 502 })
    }

    const data = await resp.json()
    if (isDebugEnabled()) {
      const preview = data?.choices?.[0]?.message?.content
      console.log("[DEBUG] evaluation v2 response:", {
        status: resp.status,
        preview: typeof preview === 'string' ? preview.slice(0, 200) : preview,
      })
    }

    const rawResponse: string = data?.choices?.[0]?.message?.content ?? ""
    
    // Parse JSON response
    let jsonResponse: unknown = {}
    try {
      jsonResponse = JSON.parse(rawResponse)
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      return NextResponse.json({ error: "Invalid JSON response from LLM" }, { status: 502 })
    }

    // Validate evaluation response format
    const validated = EvaluationResponseSchema.safeParse(jsonResponse)
    if (!validated.success) {
      console.error("Evaluation response validation failed:", validated.error)
      return NextResponse.json({ error: "Invalid response format from LLM" }, { status: 502 })
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] evaluation v2 validated response:", validated.data)
    }

    // Log API response with performance metrics
    const responseTime = Date.now() - startTime
    logAPIResponse('/api/openai/chat/v2/evaluation', 200, responseTime, {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0
    })

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error("Evaluation v2 failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
