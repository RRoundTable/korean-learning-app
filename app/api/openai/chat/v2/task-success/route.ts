import { NextRequest, NextResponse } from "next/server"
import { V2InputSchema, TaskSuccessResponseSchema, isDebugEnabled } from "../_shared"
import { getModelConfig, ModelType } from "@/lib/models/config"
import { buildTaskSuccessMessages } from "./prompts"

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
    const messages = buildTaskSuccessMessages(currentTask, user_msg, memoryHistory, scenarioContext)
    const modelConfig = getModelConfig(ModelType.CHAT_TASK_SUCCESS)
    const model = modelConfig.model
    const reasoningEffort = modelConfig.reasoningEffort

    const requestBody: any = { 
      model, 
      messages,
      response_format: { type: "json_object" }
    }
    
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort  // Will be "minimal"
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] task-success v2 request:", requestBody)
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
      console.log("[DEBUG] task-success v2 response:", {
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

    // Validate task success response format
    const validated = TaskSuccessResponseSchema.safeParse(jsonResponse)
    if (!validated.success) {
      console.error("Task success response validation failed:", validated.error)
      return NextResponse.json({ error: "Invalid response format from LLM" }, { status: 502 })
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] task-success v2 validated response:", validated.data)
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error("Task success v2 failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
