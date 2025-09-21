# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the `korean-learning-app` directory with the following variables:

```bash
# OpenAI API Key (required for STT, Chat, and TTS)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Key (optional, for alternative TTS)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# OpenAI Chat Model (optional, defaults to gpt-4o-mini)
OPENAI_CHAT_MODEL=gpt-4o-mini

# OpenAI TTS Model (optional, defaults to tts-1)
OPENAI_TTS_MODEL=tts-1

# Public API base URL (leave empty to use relative paths)
NEXT_PUBLIC_API_BASE_URL=
```

## Setup Instructions

1. Copy your OpenAI API key from https://platform.openai.com/api-keys
2. (Optional) Copy your ElevenLabs API key from https://elevenlabs.io/app/settings/api-keys
3. Create the `.env.local` file with the above content
4. Replace `your_openai_api_key_here` with your actual API key
5. Replace `your_elevenlabs_api_key_here` with your actual API key (if using TTS)

## Testing

After setting up the environment variables, restart the development server:

```bash
pnpm run dev
```

The application should now work with:
- ✅ STT (Speech-to-Text) using OpenAI Whisper
- ✅ Chat using OpenAI GPT models
- ✅ TTS (Text-to-Speech) using OpenAI TTS (primary) or ElevenLabs (optional)
