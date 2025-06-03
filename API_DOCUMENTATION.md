# Video Podcast Generator API Documentation

## Overview

The Video Podcast Generator provides a comprehensive REST API for transforming documents and text into engaging podcast content using AI. The API includes document parsing, podcast script generation, audio synthesis, and audio combination capabilities.

## Base URL

```
http://localhost:3000/api (Development)
https://your-domain.com/api (Production)
```

## Authentication

Most endpoints require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## API Endpoints

---

### 1. Document Parsing

#### `POST /api/parse-document`

Parses various document formats (PDF, DOC, DOCX, TXT, images) and extracts structured content using Upstage Document Parse API.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with `document` field containing the file

**Request Example:**
```javascript
const formData = new FormData();
formData.append("document", file);

const response = await fetch("/api/parse-document", {
  method: "POST",
  body: formData,
});
```

**Response:**
```json
{
  "api": "document-parse",
  "content": {
    "html": "<p>Extracted HTML content...</p>",
    "markdown": "# Extracted markdown content...",
    "text": "Extracted plain text content..."
  },
  "elements": [
    {
      "category": "paragraph",
      "content": {
        "html": "<p>Element content...</p>",
        "markdown": "Element content...",
        "text": "Element content..."
      },
      "coordinates": [
        {"x": 100, "y": 200},
        {"x": 300, "y": 250}
      ],
      "id": 1,
      "page": 1
    }
  ],
  "model": "document-parse",
  "usage": {
    "pages": 5
  }
}
```

**Error Responses:**
- `400`: No file provided
- `500`: Upstage API error or internal server error

**Supported File Types:**
- PDF files
- Word documents (.doc, .docx)
- Text files (.txt)
- Images (.png, .jpg, .jpeg) with OCR

**File Limits:**
- Maximum file size: 10MB

---

### 2. Podcast Script Generation

#### `POST /api/generate-podcast`

Generates engaging podcast scripts using AI with real-time streaming updates and web research integration.

**Request:**
```json
{
  "content": "Your input content text...",
  "instructions": "Create a 15-minute podcast with casual tone...",
  "generationId": "optional-generation-id"
}
```

**Headers:**
```
Content-Type: application/json
```

**Response Format:**
Server-Sent Events (SSE) stream with the following event types:

**Progress Events:**
```json
{
  "type": "progress",
  "data": {
    "stage": "outline",
    "step": "Creating podcast outline...",
    "progress": 25
  }
}
```

**Completion Event:**
```json
{
  "type": "complete",
  "data": {
    "script": "Generated podcast script...",
    "progress": {
      "stage": "complete",
      "progress": 100,
      "result": "Generated podcast script..."
    },
    "generationId": "generation-id"
  }
}
```

**Final Event:**
```json
{
  "type": "done",
  "data": {
    "message": "Generation complete"
  }
}
```

**Error Event:**
```json
{
  "type": "error",
  "data": {
    "error": "Error message"
  }
}
```

**Generation Stages:**
1. `outline` - Creating podcast structure
2. `research` - Conducting web research
3. `script` - Writing conversational scripts
4. `complete` - Finalizing the podcast

**Features:**
- Real-time streaming updates
- Web research integration via Tavily API
- Solar Pro2 LLM for high-quality script generation
- Tiki-taka conversational style
- Customizable tone and length

---

### 3. Audio Generation

#### `POST /api/generate-audio`

Converts podcast scripts to audio using OpenAI Text-to-Speech with support for multiple speakers.

**Request:**
```json
{
  "script": [
    {
      "speaker": "Hanna",
      "text": "Welcome to today's podcast episode...",
      "instruction": "Enthusiastic introduction"
    },
    {
      "speaker": "Abram", 
      "text": "Thanks for having me, it's great to be here...",
      "instruction": "Warm and professional"
    }
  ],
  "speakers": {
    "A": "Hanna",
    "B": "Abram"
  }
}
```

**Response Format:**
Server-Sent Events (SSE) stream with the following event types:

**Progress Events:**
```json
{
  "type": "progress",
  "data": {
    "step": "Generating TTS for Hanna: 'Welcome to today's...'",
    "progress": 50,
    "currentSegment": 1,
    "totalSegments": 10,
    "sessionId": "session_1234567890_abc123"
  }
}
```

**Segment Complete Events:**
```json
{
  "type": "segment_complete",
  "data": {
    "segmentIndex": 0,
    "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/file.wav",
    "filename": "session_123_segment_000_hanna.wav",
    "metadata": {
      "speaker": "Hanna",
      "text": "Welcome to today's podcast episode...",
      "instruction": "Enthusiastic introduction"
    },
    "fileSize": 98765
  }
}
```

**Completion Event:**
```json
{
  "type": "complete",
  "data": {
    "audioSegments": [
      {
        "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/file.wav",
        "filename": "session_123_segment_000_hanna.wav",
        "metadata": {
          "speaker": "Hanna",
          "text": "Welcome to...",
          "instruction": "Enthusiastic introduction"
        }
      }
    ],
    "totalSegments": 10,
    "successfulSegments": 10,
    "sessionId": "session_1234567890_abc123"
  }
}
```

**Voice Mapping:**
- `Hanna` → OpenAI `nova` voice (female, warm and engaging)
- `Abram` → OpenAI `onyx` voice (male, professional and clear)

**Mock Mode:**
Set `MOCK_AUDIO_GENERATION=true` in environment variables to generate silence instead of calling OpenAI API (useful for testing).

**Error Responses:**
- `400`: Invalid script format
- `500`: OpenAI API key not configured or internal error

---

### 4. Audio Combination

#### `POST /api/combine-audio`

Combines multiple audio segments into a single podcast file with automatic cleanup.

**Request:**
```json
{
  "audioSegments": [
    {
      "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/segment1.wav",
      "filename": "session_123_segment_000_hanna.wav",
      "metadata": {
        "speaker": "Hanna",
        "text": "Welcome to the show...",
        "instruction": "Enthusiastic"
      }
    }
  ],
  "title": "My Awesome Podcast Episode",
  "testMode": false
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "https://storage.googleapis.com/bucket/combined-podcasts/podcast_123.wav",
  "filename": "podcast_1234567890_abc123.wav",
  "fileSize": 2048576,
  "duration": 900,
  "segmentCount": 15,
  "title": "My Awesome Podcast Episode",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Features:**
- Automatic WAV file combination
- Individual segment cleanup after combination
- Duration estimation
- Firebase Storage integration
- Test mode support (adds `test_` prefix to filename)

**Error Responses:**
- `400`: No audio segments provided or download failure
- `500`: Storage configuration missing or internal error

---

### 5. Title Generation

#### `POST /api/generate-title`

Generates engaging podcast titles based on content using AI.

**Request:**
```json
{
  "content": "Your podcast content text...",
  "instructions": "Make it engaging and professional"
}
```

**Response:**
```json
{
  "title": "AI Revolution in Healthcare"
}
```

**Features:**
- Content-aware title generation
- 3-8 words optimal length
- Professional but approachable tone
- Solar Pro2 LLM with low reasoning effort for speed

**Error Responses:**
- `400`: Content is required
- `500`: Failed to generate title

---

### 6. User Generations

#### `GET /api/generations`

Retrieves user's podcast generation history with authentication.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Query Parameters:**
- `limit` (optional): Number of generations to retrieve (default: 10)

**Request Example:**
```javascript
const response = await fetch("/api/generations?limit=20", {
  headers: {
    "Authorization": `Bearer ${firebaseIdToken}`
  }
});
```

**Response:**
```json
{
  "generations": [
    {
      "id": "generation-id-123",
      "userId": "user-id-456",
      "title": "AI in Healthcare",
      "content": "Original content...",
      "script": "Generated script...",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "status": "completed",
      "audioUrl": "https://storage.googleapis.com/bucket/podcast.wav"
    }
  ]
}
```

**Error Responses:**
- `401`: No authorization token or invalid token
- `500`: Internal server error

---

## Environment Variables

### Required Environment Variables

```env
# Upstage API (Document parsing and LLM)
UPSTAGE_API_KEY=your_upstage_api_key

# OpenAI API (Text-to-Speech)
OPENAI_API_KEY=your_openai_api_key

# Tavily API (Web research)
TAVILY_API_KEY=your_tavily_api_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (Server-side only)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Optional Environment Variables

```env
# Testing and Development
MOCK_AUDIO_GENERATION=true  # Use mock audio generation instead of OpenAI API
```

---

## Error Handling

### Common Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "setup": {
    "step1": "Configuration step 1",
    "step2": "Configuration step 2"
  }
}
```

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (missing parameters, invalid data)
- `401`: Unauthorized (missing or invalid authentication)
- `500`: Internal Server Error (API failures, configuration issues)

---

## Rate Limits

- Document parsing: Limited by Upstage API quotas
- Audio generation: Limited by OpenAI API quotas
- Script generation: Limited by Upstage Solar Pro2 quotas

---

## Data Storage

### Firebase Storage Structure

```
storage-bucket/
├── audio-segments/          # Individual TTS segments
│   └── session_123_segment_000_hanna.wav
├── combined-podcasts/       # Final combined podcasts
│   └── podcast_1234567890_abc123.wav
└── test_combined-podcasts/  # Test mode podcasts
    └── test_podcast_123.wav
```

### Firestore Collections

```
/users/{userId}              # User profiles
/generations/{generationId}  # Podcast generations
/progress/{generationId}     # Real-time progress tracking
```

---

## SDK Examples

### JavaScript/TypeScript Client

```typescript
class PodcastGeneratorAPI {
  constructor(private baseURL: string, private idToken: string) {}

  async parseDocument(file: File) {
    const formData = new FormData();
    formData.append("document", file);
    
    const response = await fetch(`${this.baseURL}/parse-document`, {
      method: "POST",
      body: formData,
    });
    
    return response.json();
  }

  async generatePodcast(content: string, instructions: string) {
    const response = await fetch(`${this.baseURL}/generate-podcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, instructions }),
    });

    return response; // Use as EventSource for SSE
  }

  async getGenerations(limit = 10) {
    const response = await fetch(`${this.baseURL}/generations?limit=${limit}`, {
      headers: { "Authorization": `Bearer ${this.idToken}` },
    });
    
    return response.json();
  }
}
```

---

## Webhooks

Currently, the API uses Server-Sent Events (SSE) for real-time updates. Webhook support may be added in future versions.

---

## API Versioning

Current API version: `v2.1`

The API follows semantic versioning principles. Breaking changes will increment the major version number.

---

## Support and Contact

For API support, please refer to:
- GitHub Issues: [Repository Issues](https://github.com/hunkim/solar-podcast-gen/issues)
- Documentation: This file and inline code comments
- Environment Setup: README.md in the project root 