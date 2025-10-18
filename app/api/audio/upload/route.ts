import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { uploadAudio, getAudioMimeType, isValidAudioFormat } from '@/lib/audio-storage';

export const runtime = 'nodejs';

// Input validation schema for multipart form data
const AudioUploadSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().uuid().optional(),
  format: z.string().min(1),
  durationMs: z.coerce.number().int().min(0).optional(),
});

// Response schema
const AudioUploadResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  contentType: z.string(),
  durationMs: z.number().optional(),
  transcription: z.string().optional(),
});

export type AudioUploadInput = z.infer<typeof AudioUploadSchema>;
export type AudioUploadResponse = z.infer<typeof AudioUploadResponseSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract form fields
    const sessionId = formData.get('sessionId') as string;
    const messageId = formData.get('messageId') as string | null;
    const format = formData.get('format') as string;
    const durationMs = formData.get('durationMs') as string | null;
    
    // Validate input
    const parseResult = AudioUploadSchema.safeParse({
      sessionId,
      messageId: messageId || undefined,
      format,
      durationMs: durationMs ? parseInt(durationMs) : undefined,
    });
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const validatedData = parseResult.data;
    
    // Validate audio format
    if (!isValidAudioFormat(validatedData.format)) {
      return NextResponse.json(
        { error: 'Invalid audio format. Supported formats: mp3, webm, wav, ogg, m4a' },
        { status: 400 }
      );
    }
    
    // Get audio file from form data
    const audioFile = formData.get('audio') as File;
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const contentType = getAudioMimeType(validatedData.format);
    
    // Generate audio ID
    const audioId = uuidv4();
    
    // Upload to Vercel Blob storage
    const uploadResult = await uploadAudio(audioBuffer, {
      sessionId: validatedData.sessionId,
      messageId: validatedData.messageId,
      audioType: 'user_recording',
      format: validatedData.format,
      contentType,
      durationMs: validatedData.durationMs,
    });
    
    // TODO: Run STT on the audio for transcription
    // For now, we'll leave transcription as null
    const transcription = null;
    
    // Save metadata to database
    await db.execute({
      sql: `INSERT INTO audio_files (
        id, session_id, message_id, audio_type, format, content_type, 
        vercel_url, duration_ms, transcription
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        audioId,
        validatedData.sessionId,
        validatedData.messageId || null,
        'user_recording',
        validatedData.format,
        contentType,
        uploadResult.url,
        validatedData.durationMs || null,
        transcription
      ]
    });
    
    // Validate response
    const response: AudioUploadResponse = {
      id: audioId,
      url: uploadResult.url,
      contentType: uploadResult.contentType,
      durationMs: uploadResult.durationMs,
      transcription,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error uploading audio:', error);
    
    return NextResponse.json(
      { error: 'Failed to upload audio' },
      { status: 500 }
    );
  }
}

