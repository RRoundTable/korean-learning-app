import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ChatInputSchema, getModel, isDebugEnabled } from "../_shared"
import { buildCheckSuccessMessages } from "../prompts/check-success"

export const runtime = "nodejs"

// Response schema and type export
export const CheckSuccessResponseSchema = z.object({
  success: z.boolean(),
})
export type CheckSuccessResponse = z.infer<typeof CheckSuccessResponseSchema>

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
    const messages = buildCheckSuccessMessages({
      scenario: input.scenarioContext && {
        scenarioId: input.scenarioContext.scenarioId,
        title: input.scenarioContext.title,
        assistantRole: input.scenarioContext.assistantRole,
        userRole: input.scenarioContext.userRole,
        constraints: input.scenarioContext.constraints,
        tasks: input.scenarioContext.tasks,
        description: input.scenarioContext.description,
      },
      currentTaskKo: input.currentTask?.ko,
      history: input.memoryHistory,
      userMessage: input.userMessage,
      assistantText: input.assistantText,
    })

    const model = getModel()
    const requestBody = { model, messages, response_format: { type: "json_object" } }

    if (isDebugEnabled()) {
      console.log("[DEBUG] check-success request:", requestBody)
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
    const raw = data?.choices?.[0]?.message?.content ?? "{}"
    let json: unknown = {}
    try { json = JSON.parse(raw) } catch {}

    const validated = CheckSuccessResponseSchema.safeParse(json)
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] check-success response:", validated.data)
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error("Check-success failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


