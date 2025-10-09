import { NextRequest, NextResponse } from "next/server"
import { V2InputSchema, FeedbackResponseSchema, getModel, isDebugEnabled, getReasoningEffort } from "../_shared"
import { getModelConfig, ModelType } from "@/lib/models/config"
import { buildFeedbackMessages } from "./prompts"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = V2InputSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message = flat.formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ 
        error: message,
        details: flat.fieldErrors,
      }, { status: 400 })
    }

    const { currentTask, user_msg, memoryHistory, scenarioContext } = parsed.data
    const messages = buildFeedbackMessages(currentTask, user_msg, memoryHistory, scenarioContext)
    const model = getModelConfig(ModelType.CHAT_FEEDBACK).model

    const requestBody: any = { 
      model, 
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent feedback
      max_tokens: 200, // Limit feedback length
    }
    
    const reasoningEffort = getReasoningEffort(model)
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] feedback v2 request:", requestBody)
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
      console.log("[DEBUG] feedback v2 response:", {
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

    // Validate feedback response format
    const validated = FeedbackResponseSchema.safeParse(jsonResponse)
    if (!validated.success) {
      console.error("Feedback response validation failed:", validated.error)
      return NextResponse.json({ error: "Invalid response format from LLM" }, { status: 502 })
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] feedback v2 validated response:", validated.data)
    }

    // Return plain string (not JSON wrapped)
    return new NextResponse(validated.data.feedback, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error("Feedback v2 failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
