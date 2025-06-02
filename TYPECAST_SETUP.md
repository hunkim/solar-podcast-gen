# Typecast AI Audio Generation Setup

This guide explains how to set up Typecast AI for generating realistic podcast audio from your scripts.

## Prerequisites

1. **Typecast AI Account**: Sign up at [typecast.ai](https://typecast.ai)
2. **API Key**: Get your API key from the dashboard
3. **Actor IDs**: Choose voice actors for Hanna and Abram

## Environment Variables

Add these to your `.env.local` file:

```bash
# Typecast AI Configuration
TYPECAST_API_KEY=your_bearer_token_here
TYPECAST_HANNA_ACTOR_ID=64a25802e671d3676a7a62ca
TYPECAST_ABRAM_ACTOR_ID=52b7864f586ad15e8fc425e2
```

## Finding Actor IDs

1. Log into your Typecast account
2. Get the list of available actors using the API:
   ```bash
   curl -X GET "https://typecast.ai/api/actor" \
     -H "Authorization: Bearer your_api_key_here"
   ```
3. Choose actors for your speakers:
   - **Hanna**: Select a female voice actor 
   - **Abram**: Select a male voice actor
4. Copy the actor IDs (24-character strings like `64a25802e671d3676a7a62ca`)

## Voice Recommendations

### For Hanna (Female Host)
- Look for voices with: energetic, conversational, friendly tones
- Good for: enthusiasm, explanations, reactions
- Example: Young female voices with "cheerful" or "energetic" characteristics

### For Abram (Male Host)  
- Look for voices with: warm, professional, engaging tones
- Good for: analysis, questions, follow-ups
- Example: Professional male voices with "warm" or "conversational" characteristics

## Example .env.local

```bash
# Typecast AI Configuration
TYPECAST_API_KEY=your_bearer_token_here
TYPECAST_JULY_ACTOR_ID=64a25802e671d3676a7a62ca
TYPECAST_BRIAN_ACTOR_ID=52b7864f586ad15e8fc425e2
```

## Features

### ✨ What the Integration Provides

1. **Realistic AI Voices**: Convert text to natural-sounding speech
2. **Voice Instruction Control**: Uses the detailed voice instructions from scripts
3. **Real-time Progress**: Watch as each dialogue segment is generated
4. **Individual Playback**: Preview each audio segment separately
5. **Bulk Download**: Download all audio files at once
6. **Automatic Speaker Assignment**: Hanna and Abram get different voices

### 🎯 Audio Generation Process

1. **Script Parsing**: Extracts dialogue segments with metadata
2. **Voice Assignment**: Maps speakers to configured voice IDs
3. **Instruction Processing**: Uses voice instructions as prompts
4. **Sequential Generation**: Creates audio for each segment
5. **Quality Assurance**: Handles errors gracefully, retries failed segments

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

- Typecast pricing is per character/word generated
- Each podcast typically has 50-100 dialogue segments
- Estimated cost: $2-10 per full podcast depending on length
- Free tier usually available for testing

## Troubleshooting

### Common Issues

1. **Invalid Voice ID**: Check that voice IDs are correct format
2. **API Key Issues**: Verify your Typecast API key is valid
3. **Generation Failures**: Some segments may fail - check voice instructions
4. **Audio Quality**: Try different voices or adjust voice instructions

### Error Messages

- `TYPECAST_API_KEY not configured`: Add API key to environment
- `No voice ID configured for speaker`: Check voice ID environment variables
- `Typecast API error: 401`: Invalid API key
- `Typecast API error: 400`: Invalid request (check voice IDs)

## Advanced Configuration

### Custom Voice Mapping

The system automatically maps voice instructions to Typecast prompts:
- "excited enthusiasm" → "excitement"
- "thoughtful, slower pace" → "contemplative"  
- "playful skepticism" → "playful"

### Voice Consistency

For best results:
- Use the same voice IDs throughout a project
- Test voice combinations before generating full podcasts
- Consider voice characteristics that match your brand

## Next Steps

1. Set up your environment variables
2. Test with a short script first
3. Experiment with different voices
4. Generate your first full podcast audio!

---

**Need Help?** Check the Typecast documentation or reach out for support. 