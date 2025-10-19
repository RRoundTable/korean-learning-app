-- Migration: Unify text field for both TTS and user recordings
-- Created: 2025-01-27
-- Description: Remove transcription field and use text field for both TTS and user recordings

-- Step 1: Update existing records to use text field instead of transcription
UPDATE audio_files 
SET text = transcription 
WHERE audio_type = 'user_recording' 
  AND transcription IS NOT NULL 
  AND text IS NULL;

-- Step 2: Drop the transcription column
ALTER TABLE audio_files DROP COLUMN transcription;

-- Step 3: Add comment to clarify text field usage
-- The text field now serves dual purpose:
-- - For TTS: contains the original text that was converted to speech
-- - For user_recording: contains the transcribed text from speech-to-text
