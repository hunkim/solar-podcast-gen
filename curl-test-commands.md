# Curl Test Commands for Podcast Generator (URL-Based Audio)

## 🆕 **What Changed**
- **No more base64**: Audio files are now stored directly in Firebase Storage
- **Faster processing**: No base64 encoding/decoding overhead 
- **Better performance**: Direct URL access to audio files
- **Smaller payloads**: JSON responses contain URLs instead of large base64 strings

## 1. Test Audio Generation API

### Basic Test (2 segments)
```bash
curl -X POST http://localhost:3000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "script": [
      {
        "speaker": "Hanna",
        "text": "Hello! Welcome to our podcast today.",
        "instruction": "warm and enthusiastic greeting with rising intonation"
      },
      {
        "speaker": "Abram",
        "text": "Thanks Hanna! This is Abram, and I am excited to test this audio generation.",
        "instruction": "enthusiastic and professional with rising excitement"
      }
    ],
    "speakers": {
      "A": "Hanna",
      "B": "Abram"
    }
  }'
```

### Extended Test (5 segments)
```bash
curl -X POST http://localhost:3000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "script": [
      {
        "speaker": "Hanna",
        "text": "Welcome everyone to today'\''s podcast about artificial intelligence!",
        "instruction": "enthusiastic and welcoming with bright energy"
      },
      {
        "speaker": "Abram",
        "text": "Thanks Hanna! I'\''m really excited to dive into this topic with you.",
        "instruction": "professional and engaged with warm enthusiasm"
      },
      {
        "speaker": "Hanna",
        "text": "So Abram, what do you think is the most exciting development in AI recently?",
        "instruction": "curious and inquisitive with rising intonation"
      },
      {
        "speaker": "Abram",
        "text": "That'\''s a great question! I think the advancement in natural language processing has been incredible.",
        "instruction": "thoughtful and analytical with confident delivery"
      },
      {
        "speaker": "Hanna",
        "text": "Absolutely! The way AI can now understand context and nuance is remarkable.",
        "instruction": "agreeable and impressed with excited emphasis"
      }
    ],
    "speakers": {
      "A": "Hanna",
      "B": "Abram"
    }
  }'
```

## 2. Test Audio Combination API

### Real Audio Combination Test (using Firebase URLs)
```bash
# First, you need to run the audio generation to get real URLs
# Extract the audioUrl values from the segment_complete events
# Then use them in this combination request:

curl -X POST http://localhost:3000/api/combine-audio \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Real Audio Test Podcast",
    "testMode": true,
    "audioSegments": [
      {
        "audioUrl": "https://storage.googleapis.com/your-bucket/audio-segments/session_123_segment_000_hanna.wav",
        "filename": "session_123_segment_000_hanna.wav",
        "metadata": {
          "speaker": "Hanna",
          "text": "Welcome to our test podcast!",
          "instruction": "cheerful and welcoming with bright energy"
        }
      },
      {
        "audioUrl": "https://storage.googleapis.com/your-bucket/audio-segments/session_123_segment_001_abram.wav", 
        "filename": "session_123_segment_001_abram.wav",
        "metadata": {
          "speaker": "Abram",
          "text": "Thanks for having me!",
          "instruction": "professional and grateful with warm tone"
        }
      }
    ]
  }'
```

### Mock Audio Combination Test (for testing without real audio)
```bash
# This will fail gracefully since the URLs don't exist, but tests the API logic
curl -X POST http://localhost:3000/api/combine-audio \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mock URL Test",
    "testMode": true,
    "audioSegments": [
      {
        "audioUrl": "https://storage.googleapis.com/mock-bucket/test-audio-1.wav",
        "filename": "test-audio-1.wav",
        "metadata": {
          "speaker": "Hanna",
          "text": "Mock test segment",
          "instruction": "neutral and clear tone"
        }
      }
    ]
  }'
```

## 3. Health Check Commands

### Check if server is running
```bash
curl -I http://localhost:3000
```

### Check Firebase Storage connection
```bash
curl -X POST http://localhost:3000/api/combine-audio \
  -H "Content-Type: application/json" \
  -d '{"audioSegments": [], "title": "health-check"}' \
  | grep -q "No audio segments provided" && echo "✅ API responding" || echo "❌ API error"
```

## 4. Complete End-to-End Test

### Step 1: Generate Audio and Extract URLs
```bash
# Generate audio and save streaming response
curl -X POST http://localhost:3000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "script": [
      {
        "speaker": "Hanna",
        "text": "This is a complete end-to-end test of our podcast system.",
        "instruction": "professional and clear with confident tone"
      },
      {
        "speaker": "Abram",
        "text": "Perfect! Let's see how well this works from start to finish.",
        "instruction": "confident and optimistic with rising excitement"
      }
    ],
    "speakers": {
      "A": "Hanna",
      "B": "Abram"
    }
  }' | tee audio_generation_response.txt
```

### Step 2: Extract URLs and Test Combination
```bash
# Extract audio URLs from the response (you'll need to manually copy these)
echo "Extract audioUrl values from audio_generation_response.txt"
echo "Look for 'segment_complete' events and copy the audioUrl fields"
echo "Then use those URLs in the combine-audio API call above"
```

## 5. New: Direct Audio File Testing

### Download Generated Audio Segment
```bash
# After audio generation, you can directly download and test the audio files
curl -o test_segment.wav "https://storage.googleapis.com/your-bucket/audio-segments/session_123_segment_000_hanna.wav"

# Play it (on macOS)
afplay test_segment.wav

# Get file info
file test_segment.wav
```

### Test Audio File Accessibility
```bash
# Check if audio URLs are publicly accessible
curl -I "https://storage.googleapis.com/your-bucket/audio-segments/session_123_segment_000_hanna.wav"
```

## 6. Performance Comparison

### Old Base64 Approach (No longer used)
```
❌ Large JSON payloads (33% bigger than binary)
❌ CPU overhead for encoding/decoding
❌ Memory usage for base64 strings
❌ Slower network transfer
```

### New URL Approach (Current)
```bash
✅ Small JSON payloads (just URLs)
✅ No encoding/decoding overhead  
✅ Direct binary file access
✅ Faster network transfer
✅ Browser can stream audio directly
```

## Expected Response Formats

### Audio Generation Success (New Format)
```json
{
  "type": "segment_complete",
  "data": {
    "segmentIndex": 0,
    "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/session_123_segment_000_hanna.wav",
    "filename": "session_123_segment_000_hanna.wav",
    "metadata": {
      "speaker": "Hanna",
      "text": "Welcome to our test podcast!",
      "instruction": "cheerful and welcoming with bright energy"
    },
    "fileSize": 123456
  }
}
```

### Audio Generation Complete
```json
{
  "type": "complete",
  "data": {
    "audioSegments": [
      {
        "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/session_123_segment_000_hanna.wav",
        "filename": "session_123_segment_000_hanna.wav", 
        "metadata": { "speaker": "Hanna", "text": "...", "instruction": "..." }
      }
    ],
    "totalSegments": 2,
    "successfulSegments": 2,
    "sessionId": "session_123456_abc"
  }
}
```

### Combination Success (Updated)
```json
{
  "success": true,
  "audioId": "podcast_123456_def",
  "audioUrl": "https://storage.googleapis.com/bucket/podcasts/podcast_123456_def.wav",
  "filename": "podcast_123456_def.wav",
  "fileSize": 456789,
  "segmentCount": 2,
  "message": "Podcast combined and saved successfully!"
}
```

## Benefits of URL-Based Approach

1. **🚀 Performance**: No base64 encoding/decoding overhead
2. **💾 Memory**: Smaller JSON payloads, less memory usage
3. **🌐 Scalability**: Direct CDN delivery of audio files
4. **🔧 Debugging**: You can directly access and test audio URLs
5. **📱 Compatibility**: Works better with audio players and browsers
6. **☁️ Storage**: Leverages Firebase Storage's optimization features

## Usage Notes

1. **Prerequisites**: Firebase Storage must be properly configured
2. **URLs**: Audio URLs are publicly accessible after generation
3. **Cleanup**: Individual segment files are preserved for debugging
4. **Testing**: You can download and play audio files directly
5. **Performance**: Much faster than base64 for large audio files

## Expected Response Formats

### Audio Generation Success (New Format)
```json
{
  "type": "segment_complete",
  "data": {
    "segmentIndex": 0,
    "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/session_123_segment_000_hanna.wav",
    "filename": "session_123_segment_000_hanna.wav",
    "metadata": {
      "speaker": "Hanna",
      "text": "Welcome to our test podcast!",
      "instruction": "cheerful and welcoming with bright energy"
    },
    "fileSize": 123456
  }
}
```

### Audio Generation Complete
```json
{
  "type": "complete",
  "data": {
    "audioSegments": [
      {
        "audioUrl": "https://storage.googleapis.com/bucket/audio-segments/session_123_segment_000_hanna.wav",
        "filename": "session_123_segment_000_hanna.wav", 
        "metadata": { "speaker": "Hanna", "text": "...", "instruction": "..." }
      }
    ],
    "totalSegments": 2,
    "successfulSegments": 2,
    "sessionId": "session_123456_abc"
  }
}
```

### Combination Success (Updated)
```json
{
  "success": true,
  "audioId": "podcast_123456_def",
  "audioUrl": "https://storage.googleapis.com/bucket/podcasts/podcast_123456_def.wav",
  "filename": "podcast_123456_def.wav",
  "fileSize": 456789,
  "segmentCount": 2,
  "message": "Podcast combined and saved successfully!"
}
``` 