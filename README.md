# 🎬 AI Magic - Prompt Enhancer

A **clean, professional** Chrome extension that enhances AI prompts with a sleek 2-click workflow.

## ✨ Features

- **2-Click Enhancement**: Click icon → Click insert  
- **Clean UI**: Black transparent popup with white text  
- **Professional Animations**: Smooth, minimal transitions  
- **Universal Compatibility**: Works on ChatGPT, Claude, Gemini, and more  
- **Smart Positioning**: Popup appears at top-right of the floating icon  
- **Demo Mode**: Works without backend for instant enhancement  

## 🚀 Quick Start

### 1. Install the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `chrome-extension` folder
4. The extension icon should appear in your browser toolbar

### 2. Use the Extension

1. **Visit any AI platform** (ChatGPT, Claude, Gemini, etc.)
2. **Type your prompt** in the input box
3. **Click the floating ✨ icon** that appears next to the input
4. **Watch the clean typing animation** in the popup
5. **Click "Insert"** to replace your prompt with the enhanced version

## 🎯 How It Works

The extension automatically detects AI input fields and adds a floating ✨ icon. When clicked, it:

1. **Sends your prompt** to the backend API (or uses demo mode)
2. **Shows enhanced version** with smooth typing animation
3. **Lets you insert** the improved prompt with one click

## 🔧 Project Structure

```
prompter/
├── chrome-extension/          # Main Chrome extension
│   ├── manifest.json         # Extension configuration
│   ├── magical-enhancer.js   # Main content script
│   └── icons/               # Extension icons
├── backend/                  # Optional Python backend
│   ├── app/                 # FastAPI application modules
│   ├── main.py             # Main FastAPI application
│   ├── config.py           # Configuration
│   └── requirements.txt    # Python dependencies
├── venv/                    # Python virtual environment
└── README.md               # This file
```

## 🛠️ Backend Setup (Optional)

The extension works in demo mode by default, but you can set up the backend for real AI enhancement:

### 1. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure API Keys
```bash
# Create .env file in backend/ directory
echo "OPENAI_API_KEY=your_key_here" > .env
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
echo "GEMINI_API_KEY=your_key_here" >> .env
```

### 4. Run Backend
```bash
cd backend
python main.py
```

The backend will run on `http://localhost:8000`

## 🎨 Technical Details

### Extension Architecture
- **Content Script**: `magical-enhancer.js` - Injected into AI platform pages
- **No Background Script**: Direct API calls for simplicity
- **No Browser Popup**: Custom positioned popup for better UX

### UI Design
- **Clean & Professional**: Black transparent background, white text
- **Smart Positioning**: Popup positioned relative to floating icon
- **Responsive**: Adapts to different screen sizes
- **Smooth Animations**: Minimal, professional transitions

### Supported Platforms
- ✅ ChatGPT (`chat.openai.com`, `chatgpt.com`)
- ✅ Claude (`claude.ai`)
- ✅ Gemini (`gemini.google.com`)
- ✅ Poe (`poe.com`)
- ✅ Character.AI (`character.ai`)
- ✅ Perplexity (`perplexity.ai`)
- ✅ You.com (`you.com`)

## 🔒 Privacy & Security

- **No data collection**: Your prompts are only sent to the backend you control
- **Local processing**: Enhancement logic runs on your chosen backend
- **Secure connections**: All API calls use HTTPS
- **No tracking**: No analytics or user tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for a cleaner, more efficient AI workflow**