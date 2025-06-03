# Video Podcast Generator - Quick API Reference

## Endpoints Overview

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/parse-document` | POST | Parse documents (PDF, DOC, TXT, images) | No |
| `/api/generate-podcast` | POST | Generate podcast scripts with AI | No |
| `/api/generate-audio` | POST | Convert scripts to audio (TTS) | No |
| `/api/combine-audio` | POST | Combine audio segments into podcast | No |
| `/api/generate-title` | POST | Generate podcast titles | No |
| `/api/generations` | GET | Get user's generation history | Yes |

## Quick Examples

### 1. Parse Document
```bash
curl -X POST \
  -F "document=@file.pdf" \
  http://localhost:3000/api/parse-document
```

### 2. Generate Podcast Script
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"content":"Your content here","instructions":"Make it engaging"}' \
  http://localhost:3000/api/generate-podcast
```

### 3. Generate Audio
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "script": [
      {"speaker":"Hanna","text":"Hello world","instruction":"Friendly"}
    ],
    "speakers": {"A":"Hanna","B":"Abram"}
  }' \
  http://localhost:3000/api/generate-audio
```

### 4. Combine Audio
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "audioSegments": [
      {"audioUrl":"https://...","filename":"segment1.wav","metadata":{...}}
    ],
    "title": "My Podcast"
  }' \
  http://localhost:3000/api/combine-audio
```

### 5. Generate Title
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"content":"Your content","instructions":"Make it catchy"}' \
  http://localhost:3000/api/generate-title
```

### 6. Get Generations (Authenticated)
```bash
curl -H "Authorization: Bearer <firebase-token>" \
  http://localhost:3000/api/generations?limit=5
```

## Response Types

- **JSON Response**: Most endpoints return JSON
- **SSE Stream**: `/generate-podcast` and `/generate-audio` use Server-Sent Events
- **File Upload**: `/parse-document` accepts multipart/form-data

## Common Response Codes

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing auth token)
- `500` - Server Error (API key issues, internal errors)

## Environment Setup

```env
UPSTAGE_API_KEY=your_key
OPENAI_API_KEY=your_key  
TAVILY_API_KEY=your_key
MOCK_AUDIO_GENERATION=true  # For testing
```

## File Limits

- Document upload: 10MB max
- Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG

## Voice Mapping

- **Hanna** → OpenAI `nova` (female, warm)
- **Abram** → OpenAI `onyx` (male, professional)

## Storage Structure

```
Firebase Storage:
├── audio-segments/        # Individual TTS files
├── combined-podcasts/     # Final podcast files  
└── test_combined-podcasts/ # Test mode files
```

For detailed documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) 