import { NextRequest, NextResponse } from "next/server"
import { ChatInputSchema, getModel, isDebugEnabled, getReasoningEffort } from "../_shared"
import { buildAssistantMessages } from "./v1/prompts/assistant"
import { AssistantResponseSchema } from "./v1/prompts/types"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = ChatInputSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message = flat.formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ 
        error: message,
        details: flat.fieldErrors,
      }, { status: 400 })
    }

    const input = parsed.data
    const messages = buildAssistantMessages({
      scenario: input.scenarioContext && {
        scenarioId: input.scenarioContext.scenarioId,
        title: input.scenarioContext.title,
        assistantRole: input.scenarioContext.assistantRole,
        userRole: input.scenarioContext.userRole,
        constraints: input.scenarioContext.constraints,
        tasks: input.scenarioContext.tasks,
        description: input.scenarioContext.description,
      },
      currentTask: input.currentTask,
      progress: input.progress,
      history: input.memoryHistory,
      userMessage: input.userMessage,
    })
    const model = getModel()

    const finalMessages = messages
    const requestBody: any = { 
      model, 
      messages: finalMessages,
      response_format: { type: "json_object" }
    }
    
    const reasoningEffort = getReasoningEffort(model)
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] assistant request:", requestBody)
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
      console.log("[DEBUG] assistant response:", {
        status: resp.status,
        headers: Object.fromEntries(resp.headers),
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
      // Fallback to old format for backward compatibility
      return NextResponse.json({ 
        text: rawResponse,
        createdAt: new Date().toISOString(),
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        }
      })
    }

    // Validate assistant response format (no legacy success key)
    const validated = AssistantResponseSchema.safeParse(jsonResponse)
    if (!validated.success) {
      console.error("Conversation response validation failed:", validated.error)
      // Fallback to old format for backward compatibility
      return NextResponse.json({ 
        text: rawResponse,
        createdAt: new Date().toISOString(),
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        }
      })
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] conversation response:", validated.data)
    }

    return NextResponse.json({
      ...validated.data,
      createdAt: new Date().toISOString(),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      }
    })
  } catch (error) {
    console.error("Assistant chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


