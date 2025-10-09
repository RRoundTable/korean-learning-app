import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getReasoningEffort, getTranslationModel } from "./_shared"

const TranslateInputSchema = z.object({
  text: z.string().min(1, "Text is required"),
  targetLanguage: z.string().default('en')
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = TranslateInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Invalid input",
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const { text, targetLanguage } = parsed.data

    const model = getTranslationModel()
    const requestBody: any = {
      model,
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in Korean to ${targetLanguage} translation. Translate the following Korean text accurately and naturally. Maintain the original meaning, tone, and context. Return only the translation without any additional text, explanations, or formatting.`
        },
        {
          role: "user", 
          content: text
        }
      ],
      max_completion_tokens: 2000
    }
    
    const reasoningEffort = getReasoningEffort(model)
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      return NextResponse.json({ error: `Translation API error: ${response.status} ${errText}` }, { status: 502 })
    }

    const data = await response.json()
    const translateEn = data.choices[0].message.content.trim()
    
    if (!translateEn) {
      return NextResponse.json({ error: "Translation result is empty" }, { status: 422 })
    }
    
    return NextResponse.json({ translateEn })
  } catch (error) {
    console.error("Translation failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

