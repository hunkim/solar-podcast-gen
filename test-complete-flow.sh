#!/bin/bash

echo "🔥 Testing Complete Podcast Generation Flow..."

# Check if dev server is running
echo "1️⃣ Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dev server is running"
else
    echo "❌ Dev server not running. Start with: npm run dev"
    exit 1
fi

# Test environment variables
echo -e "\n2️⃣ Checking environment variables..."
if [ -f .env.local ]; then
    echo "✅ .env.local exists"
    
    # Check for required variables (without showing values)
    if grep -q "OPENAI_API_KEY" .env.local; then
        echo "✅ OPENAI_API_KEY found"
    else
        echo "❌ OPENAI_API_KEY missing in .env.local"
    fi
    
    if grep -q "FIREBASE_PROJECT_ID" .env.local; then
        echo "✅ Firebase config found"
    else
        echo "❌ Firebase config missing in .env.local"
    fi
else
    echo "❌ .env.local not found"
fi

# Test Firebase connectivity
echo -e "\n3️⃣ Testing Firebase connectivity..."
curl -s -X POST http://localhost:3000/api/combine-audio \
  -H "Content-Type: application/json" \
  -d '{"audioSegments": [], "title": "connectivity-test"}' | \
  grep -q "No audio segments provided" && \
  echo "✅ combine-audio API responds" || \
  echo "❌ combine-audio API not responding"

# Test audio generation with mock mode
echo -e "\n4️⃣ Testing audio generation (mock mode)..."
AUDIO_RESPONSE=$(curl -s -X POST http://localhost:3000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "script": [
      {
        "speaker": "Hanna",
        "text": "Quick test!",
        "instruction": "cheerful and bright"
      }
    ],
    "speakers": {"A": "Hanna", "B": "Abram"}
  }' 2>/dev/null)

if echo "$AUDIO_RESPONSE" | grep -q "segment_complete\|complete\|Mock"; then
    echo "✅ Audio generation working"
else
    echo "❌ Audio generation failed"
    echo "Response: $AUDIO_RESPONSE"
fi

echo -e "\n🎯 Complete flow test finished!"
echo "Next steps:"
echo "  - If tests pass: Audio generation should work"
echo "  - If Firebase fails: Deploy storage.rules with 'firebase deploy --only storage'"
echo "  - If audio fails: Check OPENAI_API_KEY in .env.local" 