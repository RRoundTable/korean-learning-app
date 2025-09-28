import { NextRequest, NextResponse } from "next/server"
import { ChatInputSchema, buildAssistantMessages, getModel, isDebugEnabled, translateToEnglish } from "../_shared"

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
    const messages = buildAssistantMessages(input)
    const model = getModel()

    const finalMessages = messages
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
    
    // Generate English translation
    let translateEn: string | undefined
    try {
      translateEn = await translateToEnglish(assistantText)
    } catch (error) {
      console.error("Translation failed:", error)
      // Continue without translation if it fails
    }
    
    return NextResponse.json({ 
      text: assistantText,
      translateEn: translateEn
    })
  } catch (error) {
    console.error("Assistant chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


