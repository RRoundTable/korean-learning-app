import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export const runtime = "nodejs";

// Path parameter validation
const TtsMediaParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate path parameter
    const validatedParams = TtsMediaParamsSchema.parse(params);
    const { id } = validatedParams;

    // Lookup TTS audio by ID
    const result = await db.execute({
      sql: `SELECT bytes, content_type, created_at FROM tts_audio WHERE id = ?`,
      args: [id]
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'TTS audio not found' },
        { status: 404 }
      );
    }

    const ttsAudio = result.rows[0] as any;
    const audioBytes = ttsAudio.bytes as Uint8Array;
    const contentType = ttsAudio.content_type as string;
    const createdAt = ttsAudio.created_at as string;

    // Calculate cache headers
    const cacheMaxAge = 60 * 60 * 24 * 30; // 30 days
    const cacheControl = `public, max-age=${cacheMaxAge}, immutable`;

    // Return audio with appropriate headers
    return new NextResponse(audioBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBytes.length.toString(),
        'Cache-Control': cacheControl,
        'Last-Modified': new Date(createdAt).toUTCString(),
        'ETag': `"${id}"`,
      },
    });

  } catch (error) {
    console.error('Error serving TTS audio:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid TTS ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to serve TTS audio' },
      { status: 500 }
    );
  }
}
