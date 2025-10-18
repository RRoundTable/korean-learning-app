-- Migration: migrate_tts_audio_to_audio_files
-- Created: 2025-10-18T02:53:43.828Z
-- Description: Migrate tts_audio table to unified audio_files table with Vercel Blob storage

-- Step 1: Create new audio_files table with unified schema
CREATE TABLE audio_files (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    message_id TEXT,
    audio_type TEXT NOT NULL CHECK (audio_type IN ('tts', 'user_recording')),
    text TEXT,
    voice TEXT,
    format TEXT NOT NULL,
    content_type TEXT NOT NULL,
    vercel_url TEXT NOT NULL,
    duration_ms INTEGER,
    transcription TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Migrate existing data from tts_audio to audio_files
-- Note: This assumes existing tts_audio records will need to be migrated to Vercel Blob
-- For now, we'll create the new table structure
INSERT INTO audio_files (
    id, session_id, message_id, audio_type, text, voice, format, 
    content_type, vercel_url, duration_ms, created_at
)
SELECT 
    id, session_id, message_id, 'tts' as audio_type, text, voice, format,
    content_type, '' as vercel_url, duration_ms, created_at
FROM tts_audio;

-- Step 3: Drop the old tts_audio table
DROP TABLE tts_audio;

-- Step 4: Create indexes for the new audio_files table
CREATE INDEX idx_audio_files_session_id ON audio_files(session_id);
CREATE INDEX idx_audio_files_message_id ON audio_files(message_id);
CREATE INDEX idx_audio_files_audio_type ON audio_files(audio_type);
CREATE INDEX idx_audio_files_created_at ON audio_files(created_at);
