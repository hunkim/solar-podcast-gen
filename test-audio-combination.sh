#!/bin/bash

echo "🧪 Testing Audio Combination API..."

# Mock base64 WAV data (this is a tiny valid WAV file header)
MOCK_AUDIO_B64="UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="

# Test the combine-audio endpoint
curl -X POST http://localhost:3000/api/combine-audio \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Podcast Combination",
    "testMode": true,
    "audioSegments": [
      {
        "audioUrl": "https://storage.googleapis.com/mock-bucket/test-audio-1.wav",
        "filename": "test-audio-1.wav",
        "metadata": {
          "speaker": "Hanna",
          "text": "Welcome to our test podcast!",
          "instruction": "cheerful and welcoming with bright energy"
        }
      },
      {
        "audioUrl": "https://storage.googleapis.com/mock-bucket/test-audio-2.wav",
        "filename": "test-audio-2.wav",
        "metadata": {
          "speaker": "Abram",
          "text": "Thanks Hanna! This is a test.",
          "instruction": "professional and grateful with warm tone"
        }
      }
    ]
  }'

echo -e "\n✅ Audio combination test completed" 