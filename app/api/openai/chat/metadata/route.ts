import { NextRequest, NextResponse } from "next/server"
import { ChatInputSchema, TurnResultSchema, getModel, isDebugEnabled, translateToEnglish } from "../_shared"
import { buildMetadataMessages } from "../prompts/metadata"

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
    const messages = buildMetadataMessages({
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

    const finalMessages = messages
    const requestBody = { model, messages: finalMessages, response_format: { type: "json_object" } }

    if (isDebugEnabled()) {
      console.log("[DEBUG] metadata request:", requestBody)
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
      console.log("[INFO] metadata response:", resp.status, errText)
      return NextResponse.json({ error: `LLM provider error: ${resp.status} ${errText}` }, { status: 502 })
    }

    const data = await resp.json()
    if (isDebugEnabled()) {
      const raw = data?.choices?.[0]?.message?.content
      console.log("[DEBUG] metadata raw response:", {
        status: resp.status,
        headers: Object.fromEntries(resp.headers),
        rawPreview: typeof raw === 'string' ? raw.slice(0, 300) : raw,
      })
    }

    const raw = data?.choices?.[0]?.message?.content ?? "{}"
    let parsedJson: any = {}
    try { parsedJson = JSON.parse(raw) } catch {}
    const parsedTurnResult = TurnResultSchema.safeParse(parsedJson)
    if (isDebugEnabled()) {
      console.log("[DEBUG] metadata parsed & validated:", {
        parseOk: parsedTurnResult.success,
        keys: parsedTurnResult.success ? Object.keys(parsedTurnResult.data || {}) : undefined,
      })
    }
    if (!parsedTurnResult.success) {
      return NextResponse.json({ error: "Metadata validation failed" }, { status: 422 })
    }
    
    const turnResult = parsedTurnResult.data
    
    // Generate English translation for hint if it exists
    if (turnResult.hint) {
      try {
        const hintTranslateEn = await translateToEnglish(turnResult.hint)
        turnResult.hintTranslateEn = hintTranslateEn
      } catch (error) {
        console.error("Hint translation failed:", error)
        // Continue without translation if it fails
      }
    }
    
    return NextResponse.json(turnResult)
  } catch (error) {
    console.error("Metadata chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


