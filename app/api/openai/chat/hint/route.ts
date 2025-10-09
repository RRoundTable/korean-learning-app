import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ChatInputSchema, isDebugEnabled, getModel, getReasoningEffort } from "../_shared"
import { buildHintMessages } from "./v1/prompts/hint"

export const runtime = "nodejs"

export const HintResponseSchema = z.object({
  hint: z.string(),
  hintTranslateEn: z.string().nullable().optional(),
})
export type HintResponse = z.infer<typeof HintResponseSchema>

// Accept same shape as ChatInput, but allow missing userMessage
const HintInputSchema = ChatInputSchema.extend({
  userMessage: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = HintInputSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message = flat.formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ 
        error: message,
        details: flat.fieldErrors,
      }, { status: 400 })
    }

    const input = parsed.data
    const messages = buildHintMessages({
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
    })

    const model = getModel()
    const requestBody: any = { model, messages }
    
    const reasoningEffort = getReasoningEffort(model)
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort
    }
    if (isDebugEnabled()) {
      console.log("[DEBUG] hint request:", requestBody)
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
    const hintText: string = data?.choices?.[0]?.message?.content ?? ""

    const payload: HintResponse = {
      hint: hintText,
      hintTranslateEn: null, // 항상 null로 설정
    }
    const validated = HintResponseSchema.safeParse(payload)
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }

    if (isDebugEnabled()) {
      console.log("[DEBUG] hint response:", validated.data)
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error("Hint failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


