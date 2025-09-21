import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

// Request payload (from multipart form-data) metadata schema
export const SttInputSchema = z.object({
  language: z.string().optional(),
  prompt: z.string().optional(),
  durationMs: z.coerce.number().optional(),
})
export type SttInput = z.infer<typeof SttInputSchema>

// Successful response schema
export const SttResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  durationMs: z.number().optional(),
})
export type SttResponse = z.infer<typeof SttResponseSchema>

// Direct STT implementation using OpenAI
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Invalid request: file is required" },
        { status: 400 }
      )
    }

    const input = SttInputSchema.safeParse({
      language: formData.get("language") ?? undefined,
      prompt: formData.get("prompt") ?? undefined,
      durationMs: formData.get("durationMs") ?? undefined,
    })

    if (!input.success) {
      return NextResponse.json(
        { error: input.error.flatten().formErrors.join("; ") || "Invalid input" },
        { status: 400 }
      )
    }

    // Build multipart form-data for OpenAI Audio Transcriptions API
    const fd = new FormData()
    fd.append("file", file, file.name || "audio.webm")
    // Use Whisper-1 model
    fd.append("model", "whisper-1")
    fd.append("response_format", "json")
    if (input.data.language) fd.append("language", input.data.language)
    if (input.data.prompt) fd.append("prompt", input.data.prompt)

    const openaiResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: fd,
    })

    if (!openaiResp.ok) {
      const errText = await openaiResp.text().catch(() => "")
      return NextResponse.json(
        { error: `STT provider error: ${openaiResp.status} ${errText}` },
        { status: 502 }
      )
    }

    // Expecting shape { text: string }
    const data = (await openaiResp.json().catch(() => ({}))) as { text?: string }
    const payload: SttResponse = SttResponseSchema.parse({
      text: String(data?.text ?? ""),
      language: input.data.language,
      durationMs: input.data.durationMs,
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Transcription failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
