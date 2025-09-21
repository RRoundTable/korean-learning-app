import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Direct TTS implementation using ElevenLabs
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 })
    }

    const body = await request.json()
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM", model = "eleven_multilingual_v2" } = body

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    // Call ElevenLabs API directly
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: `TTS failed: ${error}` }, { status: response.status })
    }

    // Return the audio blob directly
    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error("TTS failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}