import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking database for TTS audio files...');
    
    // Check audio_files table
    const audioFilesResult = await db.execute(`
      SELECT id, session_id, audio_type, text, vercel_url, created_at 
      FROM audio_files 
      WHERE audio_type = 'tts' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📊 Audio files found:', audioFilesResult.rows.length);
    
    // Check sessions table
    const sessionsResult = await db.execute(`
      SELECT id, scenario_id, created_at 
      FROM sessions 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📊 Sessions found:', sessionsResult.rows.length);
    
    // Check scenarios table
    const scenariosResult = await db.execute(`
      SELECT id, title, created_at 
      FROM scenarios 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📊 Scenarios found:', scenariosResult.rows.length);
    
    return NextResponse.json({
      success: true,
      audioFiles: audioFilesResult.rows,
      sessions: sessionsResult.rows,
      scenarios: scenariosResult.rows,
      message: 'Database check completed'
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return NextResponse.json({ 
      error: 'Database check failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
