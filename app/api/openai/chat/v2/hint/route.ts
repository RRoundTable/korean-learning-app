import { NextRequest, NextResponse } from "next/server"
import { V2InputSchema, HintResponseSchema, isDebugEnabled } from "../_shared"
import { getModelConfig, ModelType } from "@/lib/models/config"
import { buildHintMessages } from "./prompts"

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

    const input = parsed.data
    const messages = buildHintMessages(input)
    const modelConfig = getModelConfig(ModelType.CHAT_ASSISTANT)
    const model = modelConfig.model

    const requestBody: any = { model, messages }

    if (isDebugEnabled()) {
      console.log("[DEBUG] hint v2 request:", requestBody)
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

    const response = { hint: hintText, hintTranslateEn: undefined }
    const validated = HintResponseSchema.safeParse(response)
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid hint response format" }, { status: 502 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error("Hint v2 failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


