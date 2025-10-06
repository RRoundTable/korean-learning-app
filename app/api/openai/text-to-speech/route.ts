import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

// Input validation via zod (query params for streaming GET)
export const TtsQuerySchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1),
  voice: z.string().default("alloy").optional(),
  format: z.enum(["mp3", "wav"]).default("mp3").optional(),
  sampleRate: z.coerce.number().int().min(8000).max(48000).default(24000).optional(),
  instructions: z.string().optional(),
})
export type TtsQuery = z.infer<typeof TtsQuerySchema>

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

// POST method for easier integration
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json()
    const { text, voice = "alloy", format = "mp3", sampleRate = 24000, instructions } = body

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    // Call OpenAI Audio Speech API
    const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts"
    
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

    // Return the audio blob directly
    const audioBuffer = await openaiResp.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(format),
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error("TTS failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
