-- Initial schema for Korean Learning App
-- All IDs are UUID (TEXT) for better compatibility

-- 1) scenarios table
CREATE TABLE scenarios (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_en TEXT NOT NULL,
    role TEXT NOT NULL,
    user_role TEXT NOT NULL,
    description TEXT NOT NULL,
    description_en TEXT NOT NULL,
    emoji TEXT,
    is_free INTEGER NOT NULL DEFAULT 0,
    tts_voice TEXT,
    tts_instructions TEXT,
    stt_prompt TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) scenario_tasks table
CREATE TABLE scenario_tasks (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    ko TEXT NOT NULL,
    en TEXT NOT NULL,
    UNIQUE(scenario_id, idx)
);

-- 3) sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id),
    user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','feedback')),
    text TEXT NOT NULL,
    display_text TEXT,
    task_idx INTEGER,
    show_msg INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5) turns table (optional but helpful for analytics)
CREATE TABLE turns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    task_idx INTEGER NOT NULL,
    user_text TEXT NOT NULL,
    assistant_text TEXT,
    feedback_text TEXT,
    show_msg INTEGER NOT NULL,
    task_success_json TEXT,
    usage_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6) tts_audio table
CREATE TABLE tts_audio (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    message_id TEXT,
    text TEXT NOT NULL,
    voice TEXT,
    format TEXT,
    content_type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_scenario_tasks_scenario_id ON scenario_tasks(scenario_id);
CREATE INDEX idx_sessions_scenario_id ON sessions(scenario_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_turns_session_id ON turns(session_id);
CREATE INDEX idx_tts_audio_session_id ON tts_audio(session_id);
CREATE INDEX idx_tts_audio_message_id ON tts_audio(message_id);
