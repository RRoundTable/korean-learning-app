import { put, del } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export interface AudioUploadOptions {
  sessionId: string;
  messageId?: string;
  audioType: 'tts' | 'user_recording';
  text?: string;
  voice?: string;
  format: string;
  contentType: string;
  durationMs?: number;
  transcription?: string;
}

export interface AudioUploadResult {
  id: string;
  url: string;
  contentType: string;
  durationMs?: number;
}

/**
 * Upload audio data to Vercel Blob storage
 */
export async function uploadAudio(
  audioData: Buffer | Uint8Array,
  options: AudioUploadOptions
): Promise<AudioUploadResult> {
  try {
    console.log(`📤 Uploading ${options.audioType} audio to Vercel Blob...`);
    console.log(`   Session ID: ${options.sessionId}`);
    console.log(`   Format: ${options.format}`);
    console.log(`   Content Type: ${options.contentType}`);
    console.log(`   Data size: ${audioData.length} bytes`);
    
    const audioId = uuidv4();
    const filename = `${options.audioType}/${options.sessionId}/${audioId}.${options.format}`;
    
    console.log(`   Filename: ${filename}`);
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set');
    }
    
    // Upload to Vercel Blob
    const blob = await put(filename, audioData, {
      access: 'public',
      contentType: options.contentType,
    });

    console.log(`✅ Audio uploaded successfully: ${blob.url}`);

    return {
      id: audioId,
      url: blob.url,
      contentType: options.contentType,
      durationMs: options.durationMs,
    };
  } catch (error) {
    console.error('❌ Error uploading audio to Vercel Blob:', error);
    console.error('   Error details:', error);
    throw new Error('Failed to upload audio to storage');
  }
}

/**
 * Delete audio file from Vercel Blob storage
 */
export async function deleteAudio(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('❌ Error deleting audio from Vercel Blob:', error);
    throw new Error('Failed to delete audio from storage');
  }
}

/**
 * Generate a stable filename for audio files
 */
export function generateAudioFilename(
  sessionId: string,
  audioType: 'tts' | 'user_recording',
  format: string,
  customId?: string
): string {
  const id = customId || uuidv4();
  return `${audioType}/${sessionId}/${id}.${format}`;
}

/**
 * Extract audio ID from Vercel Blob URL
 */
export function extractAudioIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    return filename.split('.')[0];
  } catch {
    return null;
  }
}

/**
 * Validate audio file format
 */
export function isValidAudioFormat(format: string): boolean {
  const validFormats = ['mp3', 'webm', 'wav', 'ogg', 'm4a'];
  return validFormats.includes(format.toLowerCase());
}

/**
 * Get MIME type for audio format
 */
export function getAudioMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    webm: 'audio/webm',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
  };
  
  return mimeTypes[format.toLowerCase()] || 'audio/mpeg';
}

