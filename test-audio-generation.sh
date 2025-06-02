#!/bin/bash

echo "🧪 Testing Audio Generation API..."

# Test the generate-audio endpoint
curl -X POST http://localhost:3000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "script": [
      {
        "speaker": "Hanna",
        "text": "Welcome to our test podcast! This is just a simple test segment.",
        "instruction": "cheerful and welcoming with bright energy"
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
  }' \
  --no-buffer

echo -e "\n✅ Audio generation test completed" 