import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export const runtime = "nodejs"

// Input validation via zod (query params for streaming GET)
export const TtsQuerySchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1),
  voice: z.string().default("alloy").optional(),
  format: z.enum(["mp3", "wav"]).default("mp3").optional(),
  sampleRate: z.coerce.number().int().min(8000).max(48000).default(24000).optional(),
  instructions: z.string().optional(),
  persist: z.coerce.boolean().default(false).optional(),
  messageId: z.string().uuid().optional(),
})
export type TtsQuery = z.infer<typeof TtsQuerySchema>

// POST body schema for persistent TTS
export const TtsPostSchema = z.object({
  text: z.string().min(1),
  voice: z.string().default("alloy").optional(),
  format: z.enum(["mp3", "wav"]).default("mp3").optional(),
  sampleRate: z.number().int().min(8000).max(48000).default(24000).optional(),
  instructions: z.string().optional(),
  persist: z.boolean().default(false).optional(),
  sessionId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
})
export type TtsPostInput = z.infer<typeof TtsPostSchema>

// Response schema for persistent TTS
export const TtsPersistResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  contentType: z.string(),
  durationMs: z.number().optional(),
})
export type TtsPersistResponse = z.infer<typeof TtsPersistResponseSchema>

function contentTypeFor(format: string): string {
  return format === "wav" ? "audio/wav" : "audio/mpeg"
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parseResult = TtsQuerySchema.safeParse(params)
    if (!parseResult.success) {
      const message = parseResult.error.flatten().formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const { sessionId, text, voice = "alloy", format = "mp3", sampleRate = 24000, instructions } = parseResult.data

    // Call OpenAI Audio Speech API
    const model = process.env.OPENAI_TTS_MODEL || "tts-1"
    
    const requestBody: any = {
      model,
      input: text,
      voice,
      format, // mp3 | wav
      sample_rate: sampleRate,
    }
    
    // Add instructions if available
    if (instructions) {
      requestBody.instructions = instructions
    }
    
    const openaiResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!openaiResp.ok || !openaiResp.body) {
      const errText = await openaiResp.text().catch(() => "")
      return NextResponse.json({ error: `TTS provider error: ${openaiResp.status} ${errText}` }, { status: 502 })
    }

    // Stream to client
    return new Response(openaiResp.body, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(format),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("TTS streaming failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST method for easier integration with optional persistence
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json()
    const validatedData = TtsPostSchema.parse(body)
    const { text, voice = "alloy", format = "mp3", sampleRate = 24000, instructions, persist = false, sessionId, messageId } = validatedData

    // Call OpenAI Audio Speech API
    const model = process.env.OPENAI_TTS_MODEL || "tts-1"
    
    const requestBody: any = {
      model,
      input: text,
      voice,
      format, // mp3 | wav
      sample_rate: sampleRate,
    }
    
    // Add instructions if available
    if (instructions) {
      requestBody.instructions = instructions
    }
    
    const openaiResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!openaiResp.ok) {
      const errText = await openaiResp.text().catch(() => "")
      return NextResponse.json({ error: `TTS provider error: ${openaiResp.status} ${errText}` }, { status: 502 })
    }

    const audioBuffer = await openaiResp.arrayBuffer()
    const contentType = contentTypeFor(format)

    // If persistence is requested and sessionId is provided
    if (persist && sessionId) {
      try {
        const ttsId = uuidv4()
        
        // Save to database
        await db.execute({
          sql: `INSERT INTO tts_audio (
            id, session_id, message_id, text, voice, format, content_type, bytes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            ttsId,
            sessionId,
            messageId || null,
            text,
            voice,
            format,
            contentType,
            new Uint8Array(audioBuffer)
          ]
        })

        // Return JSON response with stable URL
        const response: TtsPersistResponse = {
          id: ttsId,
          url: `/api/media/tts/${ttsId}`,
          contentType,
        }

        return NextResponse.json(response)
      } catch (dbError) {
        console.error("Failed to persist TTS:", dbError)
        // Fall through to return audio directly if persistence fails
      }
    }

    // Return the audio blob directly (non-persistent or fallback)
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error("TTS failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
