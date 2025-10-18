import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Look up audio file in database
    const result = await db.execute({
      sql: `SELECT vercel_url, content_type FROM audio_files WHERE id = ? AND audio_type = 'tts'`,
      args: [id]
    });
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }
    
    const audioFile = result.rows[0] as any;
    const { vercel_url, content_type } = audioFile;
    
    // Redirect to Vercel Blob URL
    return NextResponse.redirect(vercel_url, 302);
    
  } catch (error) {
    console.error('❌ Error serving audio file:', error);
    
    return NextResponse.json(
      { error: 'Failed to serve audio file' },
      { status: 500 }
    );
  }
}