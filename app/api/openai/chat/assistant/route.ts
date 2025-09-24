import { NextRequest, NextResponse } from "next/server"
import { ChatInputSchema, buildMessages, getModel, isDebugEnabled } from "../_shared"

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
    const messages = buildMessages(input, "assistant")
    const model = getModel()

    const assistantSystem = `역할극 상대방의 발화(한국어)이다. 절대 선생님처럼 말하지마. 역할극에 몰입해. 한문장만 말해.`
    const finalMessages = [{ role: "system", content: assistantSystem }, ...messages]
    const requestBody = { model, messages: finalMessages }

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

    const assistantText: string = data?.choices?.[0]?.message?.content ?? ""
    return NextResponse.json({ text: assistantText })
  } catch (error) {
    console.error("Assistant chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


