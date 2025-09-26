import { NextRequest, NextResponse } from "next/server"
import { ChatInputSchema, TurnResultSchema, buildMessages, getModel, isDebugEnabled } from "../_shared"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = ChatInputSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.flatten().formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const input = parsed.data
    const messages = buildMessages(input, "metadata")
    const model = getModel()

    const metadataSystem = `Role: Evaluator. Return ONLY a JSON object that matches the provided schema. Include success, nextTaskId|null, score 0-100, hint (single helpful Korean phrase for the user to say), currentTaskId. No conversational text.`
    const finalMessages = [{ role: "system", content: metadataSystem }, ...messages]
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
    return NextResponse.json(parsedTurnResult.data)
  } catch (error) {
    console.error("Metadata chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


