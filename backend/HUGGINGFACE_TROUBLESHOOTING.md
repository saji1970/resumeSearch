# Hugging Face API Troubleshooting

## Common Reasons Why Hugging Face Fails

### 1. **Model Loading (503 Error)**
- **Issue**: Models need to be loaded into memory on first request
- **Solution**: Wait 20-30 seconds and try again, or use a smaller/faster model
- **Error**: `503 Model is loading`

### 2. **Model Not Available**
- **Issue**: `microsoft/DialoGPT-large` might be unavailable or require special access
- **Solution**: Use `microsoft/DialoGPT-medium` or `facebook/blenderbot-400M-distill`

### 3. **API Key Issues**
- **Issue**: Invalid or expired API key
- **Solution**: Verify key at https://huggingface.co/settings/tokens

### 4. **Rate Limiting**
- **Issue**: Free tier has rate limits
- **Solution**: Wait between requests or upgrade account

### 5. **Request Format**
- **Issue**: Incorrect API request format
- **Solution**: Check Hugging Face API documentation

## Recommended Solution

**Use OpenAI as primary** (more reliable):
- Set `OPENAI_API_KEY` in `backend/.env`
- OpenAI is faster and more reliable for conversational AI

**Hugging Face as fallback**:
- Works but may be slower
- Models need to load on first request
- Free tier has limitations

## Testing Hugging Face

Check backend logs for detailed error messages when Hugging Face fails.


