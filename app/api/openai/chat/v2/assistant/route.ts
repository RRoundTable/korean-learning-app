import { NextRequest, NextResponse } from "next/server"
import { V2InputSchema, getModel, isDebugEnabled, getReasoningEffort } from "../_shared"
import { buildAssistantMessages } from "./prompts"

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

    const { currentTask, user_msg, memoryHistory } = parsed.data
    const messages = buildAssistantMessages(currentTask, user_msg, memoryHistory)
    const model = getModel()

    const requestBody: any = { 
      model, 
      messages
    }
    
    const reasoningEffort = getReasoningEffort(model)
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] assistant v2 request:", requestBody)
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
      console.log("[DEBUG] assistant v2 response:", {
        status: resp.status,
        preview: typeof preview === 'string' ? preview.slice(0, 200) : preview,
      })
    }

    const rawResponse: string = data?.choices?.[0]?.message?.content ?? ""
    
    if (isDebugEnabled()) {
      console.log("[DEBUG] assistant v2 response:", rawResponse)
    }

    // Return plain string directly
    return new NextResponse(rawResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error("Assistant v2 chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
