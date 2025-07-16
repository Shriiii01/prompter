# Prompt Enhancer Backend

A powerful backend service that enhances prompts using GPT-4o mini with model-specific system prompts for different AI platforms.

## Features

- 🚀 **Unified Enhancement**: Uses GPT-4o mini as the enhancement brain for all target models
- 🎯 **Model-Specific Prompts**: Different system prompts optimized for GPT, Claude, Gemini, etc.
- ⚡ **Auto-Detection**: Automatically detects target model from URL
- 🔄 **Fallback Mode**: Works without API keys using rule-based enhancement
- 📦 **Caching**: Redis-based caching for performance
- 🛡️ **Robust**: Graceful error handling and fallbacks

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
# Required for GPT-4o mini enhancement
export OPENAI_API_KEY="your_openai_api_key_here"

# Optional - for Redis caching
export REDIS_URL="redis://localhost:6379"
```

### 3. Start the Server
```bash
# Using the startup scrip
python start_server.py

# Or directly with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Test the API
```bash
# Health check
curl http://localhost:8000/api/v1/health

# Test enhancement
curl -X POST http://localhost:8000/api/v1/enhance \
  -H "Content-Type: application/json" \
  -d '{"prompt": "help me write code", "url": "https://chat.openai.com"}'
```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/v1/health` - Health check
- `POST /api/v1/enhance` - Enhance prompts
- `POST /api/v1/analyze` - Analyze prompt quality
- `GET /api/v1/pipeline-info` - System information

## Model Support

The system automatically detects the target model from the URL and applies appropriate system prompts:

- **GPT Models**: `gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`
- **Claude Models**: `claude-3-5-sonnet`, `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`
- **Gemini Models**: `gemini-pro`, `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **Perplexity**: `perplexity-pro`, `perplexity-sonar`
- **Meta AI**: `meta-ai`, `meta-llama-2`, `meta-llama-3`

## Configuration

Environment variables:
- `OPENAI_API_KEY` - Required for GPT-4o mini enhancement
- `REDIS_URL` - Optional, defaults to `redis://localhost:6379`
- `DEBUG` - Optional, defaults to `false`

## Architecture

```
User Request → Model Detection → GPT-4o Mini + Model-Specific Prompt → Enhanced Response
```

The system uses GPT-4o mini as the "brain" but applies different system prompts based on the target model to ensure the enhanced prompt is optimized for that specific platform. 