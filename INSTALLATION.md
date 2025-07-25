# 🚀 Prompt Assistant - Installation Guide

## 📋 Overview
This guide will help you set up the Prompt Assistant system, which includes:
- **Backend API** - FastAPI server with AI prompt enhancement
- **Chrome Extension** - Browser extension for seamless prompt enhancement
- **Database** - Supabase integration for user tracking

## 🛠️ Prerequisites

### Required Software
- Python 3.8+ 
- Node.js (for development)
- Chrome/Chromium browser
- Git

### Required Accounts & API Keys
- **OpenAI API Key** - For GPT-4o mini prompt enhancement
- **Supabase Account** - For user tracking and analytics
- **Google OAuth** - For user authentication (already configured)

## 📦 Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Supabase Database
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# App Settings
VERSION=1.0.0
DEBUG=false
```

### 3. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `backend/supabase_schema.sql` in your Supabase SQL editor
3. Copy your Supabase URL and service key to the `.env` file

### 4. Start the Backend
```bash
# From project root
python start_backend.py

# Or from backend directory
cd backend
python main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/v1/health

## 🌐 Chrome Extension Setup

### 1. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder
5. The extension should appear with the name "AI Magic - Prompt Enhancer"

### 2. Extension Features
- **3D Cube Icon**: Appears on supported AI platforms
- **Drag & Click**: Drag to move, click to enhance prompts
- **Google Login**: Secure authentication with your Google account
- **Usage Tracking**: Tracks your prompt enhancement usage

### 3. Supported Platforms
- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Perplexity (perplexity.ai)
- Meta AI (meta.ai)

## 🔧 Configuration

### Backend Configuration
- **Port**: Default 8000 (change in `main.py`)
- **CORS**: Configured for localhost (update for production)
- **Logging**: Console output only (no file logging)

### Extension Configuration
- **OAuth Client ID**: Already configured for Google login
- **API Endpoint**: Points to localhost:8000 (update for production)
- **Permissions**: Minimal required permissions for functionality

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -c "from main import app; print('✅ Backend loads successfully')"
```

### Extension Tests
1. Load extension in Chrome
2. Visit any supported AI platform
3. Look for the 3D cube icon
4. Try dragging and clicking the icon
5. Test Google login in the popup

### API Tests
```bash
# Health check
curl http://localhost:8000/api/v1/health

# Test enhancement (requires API key)
curl -X POST http://localhost:8000/api/v1/enhance \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test prompt", "model": "gpt"}'
```

## 🚀 Production Deployment

### Backend Deployment
1. **Environment Variables**: Set all required API keys
2. **CORS**: Update allowed origins for your domain
3. **HTTPS**: Use SSL certificates for security
4. **Process Manager**: Use PM2 or similar for process management

### Extension Deployment
1. **Update API URL**: Change from localhost to your production domain
2. **Chrome Web Store**: Package and publish to Chrome Web Store
3. **Updates**: Implement automatic update mechanism

## 🔍 Troubleshooting

### Common Issues

#### Backend Won't Start
- Check Python version (3.8+ required)
- Verify all dependencies installed
- Check `.env` file exists and has correct values
- Ensure port 8000 is not in use

#### Extension Not Loading
- Verify Developer mode is enabled
- Check for JavaScript errors in extension console
- Ensure manifest.json is valid
- Clear browser cache and reload

#### API Calls Failing
- Verify API keys are correct
- Check network connectivity
- Ensure backend is running
- Check CORS configuration

#### Database Issues
- Verify Supabase credentials
- Check database schema is applied
- Ensure RLS policies are configured
- Test database connection

### Debug Mode
Enable debug mode in `.env`:
```bash
DEBUG=true
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation at `/docs`
3. Check browser console for extension errors
4. Verify all configuration files are correct

## 🎯 Quick Start Checklist

- [ ] Python 3.8+ installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created with API keys
- [ ] Supabase database configured
- [ ] Backend server running (`python start_backend.py`)
- [ ] Chrome extension loaded
- [ ] Tested on supported AI platform
- [ ] Google login working
- [ ] Prompt enhancement functional

**🎉 You're all set! The Prompt Assistant is ready to enhance your AI prompts!** 