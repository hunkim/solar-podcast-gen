# OpenAI TTS Audio Generation Setup

This guide explains how to set up OpenAI TTS for generating realistic podcast audio from your scripts.

## Prerequisites

1. **OpenAI Account**: Sign up at [platform.openai.com](https://platform.openai.com)
2. **API Key**: Get your API key from the OpenAI dashboard
3. **That's it!** No complex voice actor IDs needed 🎉

## Environment Variables

Add this single line to your `.env.local` file:

```bash
# OpenAI TTS Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## Getting Your API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-...`)
4. Add it to your `.env.local` file

## Voice Assignments

Our podcast features two distinct voices:
- **Hanna** (Female Host): `nova` voice - warm and engaging  
- **Abram** (Male Host): `onyx` voice - professional and clear

## Features

### ✨ What OpenAI TTS Provides

1. **High-Quality Voices**: 11 different voice options available
2. **Voice Instruction Control**: Uses detailed voice instructions from your script
3. **Instant Generation**: No polling required - immediate audio output
4. **Simple Setup**: Just one API key needed
5. **Reliable**: No complex actor IDs or configuration

### 🎯 Audio Generation Process

1. **Script Parsing**: Extracts dialogue segments with metadata
2. **Voice Assignment**: Hanna gets `nova`, Abram gets `onyx`
3. **Instruction Processing**: Uses voice instructions as tone directions
4. **Direct Generation**: Creates WAV audio files instantly
5. **No Polling**: Audio ready immediately after API call

### 📁 Output Format

- **Individual Files**: `segment-1-Hanna.wav`, `segment-2-Abram.wav`, etc.
- **High Quality**: WAV format for professional use
- **Metadata**: Includes speaker, text, and voice instruction info

## Usage

1. **Generate Script**: Complete the podcast script generation
2. **Start Audio**: Click "Generate Audio" in the final results
3. **Monitor Progress**: Watch real-time progress with segment previews
4. **Preview Audio**: Click play buttons to hear individual segments
5. **Download**: Use "Download All" to get all audio files

## API Costs

- OpenAI TTS pricing: $15 per 1M characters
- Each podcast typically has 10,000-50,000 characters
- Estimated cost: $0.15-$0.75 per full podcast
- Much more affordable than most alternatives!

## Available Voices

You can modify the voice assignment in `app/api/generate-audio/route.ts`:

```javascript
const OPENAI_VOICES = {
  Hanna: "nova",    // or: alloy, ash, ballad, coral, echo, fable, shimmer, verse
  Abram: "onyx",   // or: alloy, ash, ballad, coral, echo, fable, nova, sage, shimmer, verse
};
```

### Voice Characteristics
- **alloy** - balanced and versatile
- **ash** - clear and authoritative  
- **ballad** - smooth and conversational
- **coral** - warm and engaging
- **echo** - clear and expressive
- **fable** - engaging storyteller
- **nova** - bright and cheerful (female)
- **onyx** - deep and authoritative (male)
- **sage** - wise and measured
- **shimmer** - gentle and soothing
- **verse** - calm and pleasant

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Check that your OpenAI API key is correct
2. **Insufficient Credits**: Ensure your OpenAI account has available credits
3. **Generation Failures**: Check voice instructions for any formatting issues

### Error Messages

- `OPENAI_API_KEY not configured`: Add API key to environment
- `OpenAI TTS API error: 401`: Invalid API key
- `OpenAI TTS API error: 429`: Rate limit exceeded or insufficient credits
- `OpenAI TTS API error: 400`: Invalid request parameters

## Example .env.local

```bash
# OpenAI TTS Configuration
OPENAI_API_KEY=sk-your_actual_openai_api_key_here
```

## Next Steps

1. Set up your OpenAI API key
2. Test with a short script first
3. Generate your first full podcast audio!

---

**Much simpler than Typecast!** 🚀 Just one API key and you're ready to go. 