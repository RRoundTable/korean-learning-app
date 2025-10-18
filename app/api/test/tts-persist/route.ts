import { NextRequest, NextResponse } from 'next/server';
import { uploadAudio } from '@/lib/audio-storage';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TTS Persist Test API called');
    
    // Check environment variables
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    console.log('🔧 Environment check:', {
      hasBlobToken,
      hasOpenAIKey,
      blobTokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + '...'
    });
    
    if (!hasBlobToken) {
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN not set',
        hasBlobToken,
        hasOpenAIKey 
      }, { status: 500 });
    }
    
    if (!hasOpenAIKey) {
      return NextResponse.json({ 
        error: 'OPENAI_API_KEY not set',
        hasBlobToken,
        hasOpenAIKey 
      }, { status: 500 });
    }
    
    // Test text
    const testText = "안녕하세요, TTS 테스트입니다.";
    const sessionId = `test-session-${Date.now()}`;
    
    console.log('🎵 Testing TTS with:', { testText, sessionId });
    
    // Get a real scenario ID first
    let scenarioId;
    try {
      const scenariosResult = await db.execute('SELECT id FROM scenarios LIMIT 1');
      if (scenariosResult.rows.length > 0) {
        scenarioId = scenariosResult.rows[0].id;
        console.log('✅ Found scenario ID:', scenarioId);
      } else {
        return NextResponse.json({ 
          error: 'No scenarios found in database. Please seed the database first.' 
        }, { status: 500 });
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Failed to get scenario ID',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Create test session first
    try {
      await db.execute({
        sql: 'INSERT INTO sessions (id, scenario_id) VALUES (?, ?)',
        args: [sessionId, scenarioId]
      });
      console.log('✅ Test session created:', sessionId);
    } catch (sessionError) {
      console.log('⚠️ Session might already exist, continuing...');
    }
    
    // Call OpenAI TTS API
    const openaiResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: testText,
        voice: "nova",
        format: "mp3",
        sample_rate: 24000,
      }),
    });

    if (!openaiResp.ok) {
      const errorText = await openaiResp.text();
      console.error('❌ OpenAI TTS API error:', openaiResp.status, errorText);
      return NextResponse.json({ 
        error: `OpenAI TTS API error: ${openaiResp.status}`,
        details: errorText 
      }, { status: 502 });
    }

    const audioBuffer = await openaiResp.arrayBuffer();
    console.log('✅ OpenAI TTS response received, audio size:', audioBuffer.byteLength);
    
    // Test Vercel Blob upload
    try {
      const uploadResult = await uploadAudio(
        new Uint8Array(audioBuffer),
        {
          sessionId,
          audioType: 'tts',
          text: testText,
          voice: 'nova',
          format: 'mp3',
          contentType: 'audio/mpeg',
        }
      );
      
      console.log('✅ Vercel Blob upload successful:', uploadResult.url);
      
      // Test database insertion
      const audioId = uuidv4();
      await db.execute({
        sql: `INSERT INTO audio_files (
          id, session_id, message_id, audio_type, text, voice, format, 
          content_type, vercel_url, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          audioId,
          sessionId,
          null, // messageId
          'tts',
          testText,
          'nova',
          'mp3',
          'audio/mpeg',
          uploadResult.url,
          null // durationMs
        ]
      });
      
      console.log('✅ Database insertion successful, audio ID:', audioId);
      
      return NextResponse.json({
        success: true,
        audioId,
        url: uploadResult.url,
        sessionId,
        message: 'TTS persistence test completed successfully'
      });
      
    } catch (uploadError) {
      console.error('❌ Vercel Blob upload failed:', uploadError);
      return NextResponse.json({ 
        error: 'Vercel Blob upload failed',
        details: uploadError instanceof Error ? uploadError.message : String(uploadError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ TTS Persist Test failed:', error);
    return NextResponse.json({ 
      error: 'TTS persist test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
