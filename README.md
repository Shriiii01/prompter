# AI Magic - Chrome Extension

A powerful Chrome extension that enhances AI prompts using multiple LLM providers (OpenAI, Gemini, Anthropic) with a seamless payment system for unlimited usage.

## 🚀 Features

- **Multi-Provider AI Enhancement**: Supports OpenAI GPT-4, Google Gemini, and Anthropic Claude
- **Seamless Integration**: Works on ChatGPT, Claude, Perplexity, and other AI platforms
- **Smart Prompt Analysis**: Automatically detects and enhances prompts for better AI responses
- **Payment System**: Free tier (5 prompts/day) + Pro tier ($5/month unlimited)
- **Real-time Processing**: Instant prompt enhancement without leaving the page
- **User Management**: Google OAuth authentication with Supabase backend

## 🏗️ Architecture

### Frontend (Chrome Extension)
- **Popup UI**: Clean, modern interface with subscription management
- **Content Scripts**: Seamless integration with AI platforms
- **Background Scripts**: Handles authentication and state management
- **Modules**: Organized code structure for maintainability

### Backend (FastAPI + Supabase)
- **API Endpoints**: RESTful API for user management and prompt enhancement
- **Payment Integration**: Razorpay for subscription processing
- **Database**: Supabase for user data and subscription tracking
- **Multi-Provider**: Intelligent routing between AI services

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Python FastAPI, Supabase
- **Payment**: Razorpay
- **AI Providers**: OpenAI, Google Gemini, Anthropic
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Docker, Docker Compose

## 📁 Project Structure

```
prompter/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core business logic
│   │   ├── models/         # Data models
│   │   ├── services/       # Business services
│   │   └── utils/          # Utility functions
│   ├── config.py           # Configuration
│   ├── main.py            # FastAPI app
│   └── requirements.txt    # Python dependencies
├── chrome-extension/       # Chrome extension
│   ├── modules/           # JavaScript modules
│   ├── popup.html         # Extension popup
│   ├── popup.js           # Popup logic
│   ├── background.js      # Background script
│   └── manifest.json      # Extension manifest
├── deployment/            # Deployment configs
└── README.md             # This file
```

## 🚀 Quick Start

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd prompter/backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file with your credentials
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   OPENAI_API_KEY=your_openai_key
   GEMINI_API_KEY=your_gemini_key
   ANTHROPIC_API_KEY=your_anthropic_key
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_SECRET_KEY=your_razorpay_secret
   ```

4. **Run the backend**
   ```bash
   python main.py
   ```

### Chrome Extension Setup

1. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"

2. **Load the extension**
   - Click "Load unpacked"
   - Select the `chrome-extension/` folder

3. **Configure the extension**
   - Update `config.js` with your backend URL
   - Sign in with Google OAuth

## 💳 Payment System

- **Free Tier**: 5 prompts per day
- **Pro Tier**: $5/month for unlimited usage
- **Payment Gateway**: Razorpay integration
- **Seamless UX**: Payment happens within the extension popup

## 🔧 Configuration

### Backend Configuration
- **Database**: Supabase PostgreSQL
- **Rate Limiting**: Configurable per-user limits
- **Circuit Breaker**: Built-in resilience patterns
- **Caching**: Redis-based response caching

### Extension Configuration
- **API Endpoints**: Configurable backend URLs
- **Authentication**: Google OAuth integration
- **UI Customization**: Modular component system

## 🧪 Testing

```bash
# Backend tests
cd backend
python -m pytest tests/

# Extension testing
# Load in Chrome and test on various AI platforms
```

## 🚀 Deployment

### Docker Deployment
```bash
cd deployment
docker-compose up -d
```

### Manual Deployment
1. Deploy backend to your preferred hosting
2. Update extension config with production URLs
3. Publish extension to Chrome Web Store

## 📊 Monitoring

- **Health Checks**: Built-in health monitoring
- **Rate Limiting**: User usage tracking
- **Error Logging**: Comprehensive error handling
- **Performance Metrics**: Response time monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔮 Roadmap

- [ ] Additional AI providers
- [ ] Advanced prompt templates
- [ ] Team collaboration features
- [ ] Analytics dashboard
- [ ] Mobile app companion

---

**Built with ❤️ for the AI community**
