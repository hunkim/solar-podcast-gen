# Video Podcast Generator

A Next.js application that transforms documents and text into engaging video and podcast content using AI.

## Features

- **Document Upload & Parse**: Upload various document formats (PDF, DOC, DOCX, TXT, images) and extract text using [Upstage Document Parse API](https://console.upstage.ai/docs/capabilities/document-digitization/document-parsing)
- **Text Input**: Direct text input for content generation
- **Drag & Drop**: Modern file upload with drag and drop functionality
- **AI-Powered Script Generation**: Generate engaging podcast scripts with Solar Pro2 LLM
- **Web Research Integration**: Enrich content with real-time web search using Tavily API
- **Progressive Generation**: Real-time progress tracking with streaming updates
- **Professional Scripts**: Create tiki-taka style conversational scripts between two hosts
- **User Authentication**: Secure Google authentication with Firebase
- **Generation History**: Save and track all your podcast generations with Firestore
- **Progress Persistence**: Resume interrupted generations and view detailed history

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory and add your API keys and Firebase configuration:

```env
# Upstage Document Parse API Key
# Get your API key from https://console.upstage.ai/
UPSTAGE_API_KEY=your_upstage_api_key_here

# Tavily Search API Key (for web research)
# Get your API key from https://tavily.com/
TAVILY_API_KEY=your_tavily_api_key_here

# Firebase Client Configuration (these can be public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCBqLyjbvPphduOCa_ohwYKXXrfn5nV6rs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=solar-podcast-flow.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=solar-podcast-flow
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=solar-podcast-flow.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=407483710709
NEXT_PUBLIC_FIREBASE_APP_ID=1:407483710709:web:6a0ff3bddd138e0316d9bc

# Firebase Admin SDK (keep these secret - server-side only)
FIREBASE_PROJECT_ID=solar-podcast-flow
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@solar-podcast-flow.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCt666WQR979cg5\nPUEMWZjn0Cywoyt3qsl5zK6pD53E8aLjXsMAHeN2AClr9zE4jxQonqsPPQarSrfO\nQlwcY5U+Oohwm1JUiRJQPEqpXem4IenVd/EQe6ZqQmWA8CmJCy+CmPxBjUVLe0dT\niqkkB4pMI34anzJyfUvurgUXKB9DDM0vRyUJ5iE+37cQgy21/pGp/e3tDgETZD2K\nnZSRgV1boEMxYH6IC7993NB1D/ufiSSQ1i4/kpXI40Ric7ga/iZHRTk1tzB/0LEQ\nGzbTIkSFJuFJLPh8ARIEC3CyMEb3DUIJKJHlwnLc962DSdGmXYzjTWwF3Va3Bnav\no3OwN3GrAgMBAAECggEAHCofgruXEqbxvrs5rntP9LJUmmJCJsXkjLHl0wDxZrRO\n0Y1F/N3aOQC7tH06XlNlS1KulvAmBVU7QM6kRgCmaYZnE/1DLudnrNCmspi/wY7U\nZDphMm8juu93qpK51zSVhAusRh1PjHKxUUkSLQB/l+bjhAIl1D6QLl3F+0MHFP9Y\nQY7uOpSvyvxhiYTtJnt0bctyAL7Wt45JC23dC42yEMjUuS3038e17B0AhrYqf+xK\nZg1OktzHn/6YhvdtFv1PH3z56yjxFCOqTOQ3qgLKYpdrwPS8NclBXAHLnoyARiOY\n/gZKqXFYzNyLlxa41HSLHVED33g294feyq6v9HkKYQKBgQDfvcq2ybcOCCfUxhWl\n7NKURI1b9dRd1yqDFlv4SuBIPVt548kW7jVF+FSVjfKV3RknOp4fJynutJQ1QE9M\nSaw7FcX+zcj6zAV8WTvkyKZKQHCk69C012rysNyw+bNezb2C/eyPbBCfaIAwRg77\nY+OvDHVOlynfKNe5f7RYOCs8MQKBgQDG/waULmiSRNM5lp21cA2NAkF3Tpi2f6s0\ncVb+ofuq2iDbfYc9+UvIt15jYqXSpCVmChMvujsA1yG49VNurZYt8Sm1RuM6kqg+\nU0lw6SlmkGjMQ32SYvcQBpHGrvUC6689VAzJoLLbe3pM7tPv66d9jNY0brkZ03Bd\njozxLioAmwKBgCri5EJZM99arNfaCDg/xrVo1ne0DTrXjWyHEqXrJEZ0jF42zUq5\n6jg5O21XQhJ7yOB+GeT6yszYjDgQ1aJX1M2WhNcsdsOr67lEGXjnBQjihTT3ho/D\nYtqWEBdUJY+cfCDprzhmjGEh1MBsDV8ebHwXNT0VOI9v8rm5wsXOLmthAoGBAIds\nVtXRH2krXXP7hChNsWsc9eBzpInOKHzwBPwU0GhdOa8lpjwOw/w8jgekwqSvAKSI\nhrYcTrsrrM9qZPUVPPbXAENVkp3x4H1JwNkOVBZwgGFCLNrKbsiBMAO+XQ83xXI/\nGNS+f/nN9lUU0zabcMiIZ94W2/Eva3C/6jrX582xAoGBAKzco2Cpu5eUS+brW+Y4\nBQ5SWnxAY6aqEDIXhJB4wVXTfk/ALr5M5YR3WXriGZMIxIeK388TBEB0Uz0G5Grt\nAvGtJZL+ophsdMvtwNiDAvcefpqzR+qoExuS7r+nizk67/8TomFXhrmDqjdnDxjJ\n0+BeO4tbeKgc6xmmSGCu8bf3\n-----END PRIVATE KEY-----\n"
```

To get API keys:

**Upstage API Key:**
1. Visit [Upstage Console](https://console.upstage.ai/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env.local` file

**Tavily API Key:**
1. Visit [Tavily](https://tavily.com/)
2. Sign up for an account
3. Go to your dashboard
4. Generate an API key
5. Copy the key to your `.env.local` file

**Firebase Configuration:**
The Firebase configuration provided above is already set up for your project. The client configuration (NEXT_PUBLIC_*) is safe to expose publicly, while the admin SDK configuration should be kept secret.

### 3. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication & Data Persistence

The application now includes Firebase integration for:

### 🔐 **User Authentication**
- Google Sign-In with Firebase Auth
- Secure session management
- User profile integration
- Protected routes and features

### 💾 **Data Persistence**
- **Generation History**: All podcast generations are saved to Firestore
- **Progress Tracking**: Real-time generation progress stored in database
- **Resume Capability**: Resume interrupted generations
- **User Collections**: Each user has their own private data

### 📊 **Firestore Collections**
- `users/{userId}` - User profile and preferences
- `generations/{generationId}` - Individual podcast generation records
- `progress/{generationId}` - Real-time generation progress tracking

## Podcast Generation Features

The application now includes a complete podcast script generation pipeline:

### 🎯 Structured Generation Process

1. **Content Analysis**: Analyze input content and instructions
2. **Outline Creation**: Generate structured podcast sections with LLM
3. **Web Research**: Enrich content with real-time search results via Tavily
4. **Script Writing**: Create engaging conversational scripts for each section
5. **Final Polish**: Combine and refine the complete script

### 🤖 AI-Powered Features

- **Solar Pro2 LLM**: High-quality script generation with reasoning
- **Streaming Generation**: Real-time progress updates
- **Tavily Search Integration**: Automatically find relevant, up-to-date information
- **Smart Query Generation**: Context-aware search queries based on content
- **Conversational Style**: Natural tiki-taka dialogue between two hosts

### 📝 Script Features

- Professional podcast format with two hosts (Alex and Jordan)
- Natural conversational flow with smooth transitions
- Integration of search results and current information
- Customizable tone, style, and target audience
- Stage directions and timing cues
- Easy copy/download functionality

## File Upload Feature

The application supports uploading various document types:

- **PDF files**: Extract text and structure from PDF documents
- **Word documents**: .doc and .docx files
- **Text files**: Plain text files
- **Images**: .png, .jpg, .jpeg files with OCR capabilities

### Supported Features:

1. **Drag & Drop Upload**: Simply drag files onto the upload area
2. **Click to Browse**: Traditional file selection
3. **Real-time Processing**: See upload and processing progress
4. **Text Preview**: View and edit extracted text before generating content
5. **Document Metadata**: View page count and element information
6. **Error Handling**: Clear error messages for unsupported files or API issues

### File Limits:

- Maximum file size: 10MB
- Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG

## Usage

1. **Choose Input Method**: Select between "Text Input" or "Document Upload" tabs
2. **Provide Content**: 
   - For text: Paste or type your content directly
   - For documents: Upload your file using drag & drop or file browser
3. **Review Extracted Text**: If using document upload, review and edit the extracted text
4. **Add Instructions**: Specify how you want your content generated (style, tone, length, etc.)
5. **Generate Content**: Click the generate button to start the AI-powered script creation
6. **Watch Progress**: Monitor real-time generation progress with detailed stage tracking
7. **Review & Edit**: Review the generated script and make any necessary adjustments
8. **Export**: Copy to clipboard or download the final script

## API Integration

The application integrates with multiple powerful APIs:

### Upstage Document Parse API
- Multiple output formats (HTML, text)
- OCR for scanned documents and images
- Coordinate information for precise element positioning
- Table extraction with base64 encoding
- Multi-page document processing

### Upstage Solar Pro2 LLM
- High-quality natural language generation
- Reasoning capabilities for better outputs
- Streaming responses for real-time updates
- Customizable parameters (temperature, max tokens)

### Tavily Search API
- Real-time web search optimized for AI
- Advanced search depth options
- Content filtering and ranking
- Reliable, up-to-date information retrieval

For more information:
- [Upstage Document Parse](https://console.upstage.ai/docs/capabilities/document-digitization/document-parsing)
- [Tavily Search API](https://tavily.com/)

## Development

The podcast generation feature is built with:

- **Frontend**: React components with TypeScript
- **Backend**: Next.js API routes with streaming support
- **LLM Integration**: Solar Pro2 with structured output
- **Search Integration**: Tavily API for web research
- **File Processing**: Upstage Document Parse API
- **UI Components**: Radix UI with Tailwind CSS
- **Real-time Updates**: Server-Sent Events (SSE)

Key files:
- `lib/llm.ts`: LLM service with streaming support
- `lib/search.ts`: Web search integration with Tavily
- `lib/podcast-generator.ts`: Main podcast generation logic
- `components/podcast-generation.tsx`: Real-time generation UI
- `components/file-upload.tsx`: File upload with progress tracking
- `app/api/generate-podcast/route.ts`: Streaming API endpoint
- `app/api/parse-document/route.ts`: Document processing endpoint

## Security Notes

- All API keys are stored securely in environment variables
- File processing happens on the server side to protect API credentials
- Client-side validation prevents unauthorized file uploads
- Files are processed in memory and not stored permanently
- Streaming responses prevent API key exposure
- CORS headers properly configured for security 