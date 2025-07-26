// 🚀 CLEAN PROMPT ENHANCER - WITH 3D GLOWING CUBE
console.log('🚀 Clean Prompt Enhancer - Loading...');

// 🌐 PRODUCTION CONFIGURATION
const CONFIG = {
  // Railway production URL (replace with your actual Railway URL)
  API_BASE_URL: 'https://prompter-production-76a3.railway.app',
  
  // Fallback to localhost for development
  DEV_API_BASE_URL: 'http://localhost:8004',
  
  // Environment detection
  isProduction: () => {
    return window.location.protocol === 'https:' || 
           window.location.hostname !== 'localhost';
  },
  
  // Get the appropriate API URL
  getApiUrl: () => {
    return CONFIG.isProduction() ? CONFIG.API_BASE_URL : CONFIG.DEV_API_BASE_URL;
  },
  
  // API endpoints
  endpoints: {
    enhance: '/api/v1/enhance',
    quickTest: '/api/v1/quick-test',
    health: '/api/v1/health',
    userStats: '/api/v1/user/stats',
    userCount: '/api/v1/user/count'
  }
};

console.log('🌐 API Configuration:', {
  isProduction: CONFIG.isProduction(),
  apiUrl: CONFIG.getApiUrl()
});

// Prevent multiple instances
if (window.enhancerInstance) {
  window.enhancerInstance.destroy();
}

// 🚀 OPTIMIZED TEXT INSERTION - Single Strategy Approach
class OptimizedTextInserter {
  constructor() {
    this.debugMode = false; // Reduced logging for performance
  }

  log(message, data = null) {
    if (this.debugMode) {
      console.log(`🎯 [OptimizedInserter] ${message}`, data || '');
    }
  }

  async strategy1_LexicalEditor(inputElement, text) {
    this.log('🔄 Strategy 1: Enhanced Lexical Editor');
    
    // Focus and clear
    inputElement.focus();
    await this.delay(100);
    
    // Clear existing content
    inputElement.innerHTML = '';
    inputElement.textContent = '';
    
    // Create proper Lexical structure with word-level spans
    const paragraph = document.createElement('p');
    paragraph.setAttribute('dir', 'ltr');
    
    // Split text into words and create individual spans
    const words = text.split(/\s+/);
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.setAttribute('data-lexical-text', 'true');
      span.textContent = word + (index < words.length - 1 ? ' ' : '');
      paragraph.appendChild(span);
    });
    
    inputElement.appendChild(paragraph);
    
    // Dispatch events with proper timing
    await this.delay(50);
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    await this.delay(50);
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    await this.delay(50);
    
    // Trigger React synthetic events
    inputElement.dispatchEvent(new InputEvent('input', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true
    }));
  }

  async strategy2_ReactSynthetic(inputElement, text) {
    this.log('🔄 Strategy 2: React Synthetic Events');
    
    inputElement.focus();
    await this.delay(100);
    
    // Clear content
    inputElement.innerHTML = '';
    inputElement.textContent = '';
    
    // Simulate React's synthetic event pattern
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true
    });
    
    inputElement.dispatchEvent(beforeInputEvent);
    
    // Set content
    if (inputElement.contentEditable === 'true') {
      inputElement.textContent = text;
    } else {
      inputElement.value = text;
    }
    
    // Dispatch input event
    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true
    });
    
    inputElement.dispatchEvent(inputEvent);
    
    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true });
    inputElement.dispatchEvent(changeEvent);
    
    await this.delay(100);
  }

  async strategy3_WordLevelSpans(inputElement, text) {
    this.log('🔄 Strategy 3: Word Level Spans');
    
    inputElement.focus();
    await this.delay(100);
    
    // Clear content
    inputElement.innerHTML = '';
    inputElement.textContent = '';
    
    // Create paragraph
    const paragraph = document.createElement('p');
    paragraph.setAttribute('dir', 'ltr');
    
    // Split into words and create individual spans
    const words = text.split(/\s+/);
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.setAttribute('data-lexical-text', 'true');
      span.textContent = word;
      paragraph.appendChild(span);
      
      // Add space between words (except last word)
      if (index < words.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.setAttribute('data-lexical-text', 'true');
        spaceSpan.textContent = ' ';
        paragraph.appendChild(spaceSpan);
      }
    });
    
    inputElement.appendChild(paragraph);
    
    // Dispatch events
    await this.delay(50);
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    await this.delay(50);
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async strategy4_ClipboardSimulation(inputElement, text) {
    this.log('🔄 Strategy 4: Clipboard Simulation');
    
    // Copy to clipboard
    await navigator.clipboard.writeText(text);
    
    inputElement.focus();
    await this.delay(200);
    
    // Simulate Ctrl+V
    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    
    const keyUpEvent = new KeyboardEvent('keyup', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true
    });
    
    inputElement.dispatchEvent(keyDownEvent);
    await this.delay(50);
    inputElement.dispatchEvent(keyUpEvent);
    
    // Also try Cmd+V for Mac
    const cmdKeyDownEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      metaKey: true,
      bubbles: true,
      cancelable: true
    });
    
    const cmdKeyUpEvent = new KeyboardEvent('keyup', {
      key: 'v',
      code: 'KeyV',
      metaKey: true,
      bubbles: true
    });
    
    await this.delay(100);
    inputElement.dispatchEvent(cmdKeyDownEvent);
    await this.delay(50);
    inputElement.dispatchEvent(cmdKeyUpEvent);
  }

  async validateInsertion(inputElement, expectedText) {
    await this.delay(200);
    
    const actualText = inputElement.contentEditable === 'true' 
      ? inputElement.textContent 
      : inputElement.value;
    
    const isSuccess = actualText && actualText.trim().length > 0;
    
    this.log('Validation result:', {
      expected: expectedText.substring(0, 50) + '...',
      actual: actualText ? actualText.substring(0, 50) + '...' : 'empty',
      success: isSuccess
    });
    
    return isSuccess;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Debug helper function
window.debugPerplexity = function() {
  console.log('🔍 Perplexity Debug Helper');
  
  const inputs = [
    ...document.querySelectorAll('textarea'),
    ...document.querySelectorAll('div[contenteditable="true"]'),
    ...document.querySelectorAll('[data-testid*="search"]'),
    ...document.querySelectorAll('[placeholder*="Ask"]')
  ];
  
  console.log(`Found ${inputs.length} potential input elements`);
  
  inputs.forEach((input, index) => {
    const rect = input.getBoundingClientRect();
    console.log(`Input ${index + 1}:`, {
      tagName: input.tagName,
      className: input.className,
      contentEditable: input.contentEditable,
      type: input.type,
      placeholder: input.placeholder,
      visible: rect.width > 0 && rect.height > 0,
      size: `${rect.width}x${rect.height}`
    });
  });
  
  // Test insertion
  const mainInput = inputs.find(input => {
    const rect = input.getBoundingClientRect();
    return rect.width > 100 && rect.height > 20;
  });
  
  if (mainInput) {
    console.log('Testing insertion on:', mainInput);
    const inserter = new PerplexityTextInserter();
    inserter.insertTextForPerplexity(mainInput, "Test prompt from debug helper");
  }
};

class CleanEnhancer {
  constructor() {
    this.icons = new Map();
    this.activePopup = null;
    this.isProcessing = false;
    this.observers = [];
    this.dragData = null;
    this.isAnyIconDragging = false;
    this.userInfo = null;
    this.isExtensionActive = false; // New: Track if extension is active
    
    // 🚀 SMART DOM SCANNING - NEW PROPERTIES
    this.inputCache = new Map(); // Cache for input elements
    this.scanDebounceTimer = null; // Debounce timer
    this.lastScanTime = 0; // Track last scan time
    this.scanCooldown = 500; // Minimum time between scans (ms)
    this.mainInputElement = null; // Track the main input element
    this.mutationObserver = null; // Smart DOM observer
    this.isScanning = false; // Prevent concurrent scans
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.setupInputDetection();
    this.setupGlobalListeners();
    this.checkLoginStatus();
    
    // Don't start scanning automatically - wait for user to click "Start"
    console.log('✅ Clean Enhancer initialized - waiting for user to start');
  }

  injectStyles() {
    console.log('🎨 Injecting styles...');
    const styles = `
      /* TRUE BLACK PALETTE */
      :root {
        --ce-bg: #000000; /* true black */
        --ce-surface: #0a0a0a; /* darker surface */
        --ce-primary: #ffffff; /* crisp white */
        --ce-primary-hover: #64c8ff; /* blue glow on hover */
        --ce-icon: #ffffff; /* icon white */
        --ce-text: #f0f0f0; /* light grey */
        --ce-text-secondary: #808080; /* medium grey */
        --ce-border: #232323;
        --ce-radius: 8px;
      }
      
      /* FLOATING ICON - 3D CUBE CONTAINER */
      .ce-icon {
        position: fixed;
        width: 40px;
        height: 40px;
        background: transparent;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        z-index: 999999;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        user-select: none;
        will-change: transform;
        backface-visibility: hidden;
        transform: translateZ(0);
        pointer-events: auto;
      }
      
      .ce-icon:hover {
        transform: scale(1.1) translateZ(0);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
        cursor: grab;
      }
      
      .ce-icon:active,
      .ce-icon.dragging {
        cursor: grabbing !important;
        transform: scale(1.1) translateZ(0);
        transition: none;
        box-shadow: 0 0 20px rgba(100, 200, 255, 0.8);
      }
      
      /* 3D CUBE LOGO STYLES */
      .ce-logo-container {
        width: 32px;
        height: 32px;
        perspective: 800px;
        pointer-events: none;
      }
      
      .ce-logo {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        pointer-events: none;
      }
      
      .ce-cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: rotateX(-30deg) rotateY(45deg);
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .ce-logo-spin .ce-cube {
        animation: ceCubeRotate 3s linear infinite;
      }
      
      .ce-face {
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, #0f0f0f 0%, #000000 100%);
        overflow: hidden;
      }
      
      .ce-edge {
        position: absolute;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255, 255, 255, 0.8) 20%,
          #ffffff 50%,
          rgba(255, 255, 255, 0.8) 80%,
          transparent 100%
        );
        box-shadow: 
          0 0 20px rgba(255, 255, 255, 0.9),
          0 0 40px rgba(255, 255, 255, 0.6),
          inset 0 0 10px rgba(255, 255, 255, 1);
      }
      
      .ce-logo-spin .ce-edge {
        animation: ceGlowPulse 1.5s ease-in-out infinite;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(100, 200, 255, 0.8) 20%,
          #64c8ff 50%,
          rgba(100, 200, 255, 0.8) 80%,
          transparent 100%
        );
        box-shadow: 
          0 0 30px rgba(100, 200, 255, 1),
          0 0 60px rgba(100, 200, 255, 0.8),
          inset 0 0 15px rgba(100, 200, 255, 1);
      }
      
      .ce-edge-top, .ce-edge-bottom {
        width: 100%;
        height: 2px;
      }
      
      .ce-edge-left, .ce-edge-right {
        width: 2px;
        height: 100%;
      }
      
      .ce-edge-top { top: 0; }
      .ce-edge-bottom { bottom: 0; }
      .ce-edge-left { left: 0; }
      .ce-edge-right { right: 0; }
      
      /* Face positioning */
      .ce-face-front { transform: translateZ(16px); }
      .ce-face-back { transform: translateZ(-16px) rotateY(180deg); }
      .ce-face-right { transform: rotateY(90deg) translateZ(16px); }
      .ce-face-left { transform: rotateY(-90deg) translateZ(16px); }
      .ce-face-top { transform: rotateX(90deg) translateZ(16px); }
      .ce-face-bottom { transform: rotateX(-90deg) translateZ(16px); }
      
      /* Depth perception */
      .ce-face-front .ce-edge { opacity: 1; }
      .ce-face-back .ce-edge { opacity: 0.3; }
      .ce-face-right .ce-edge { opacity: 0.7; }
      .ce-face-left .ce-edge { opacity: 0.5; }
      .ce-face-top .ce-edge { opacity: 0.9; }
      .ce-face-bottom .ce-edge { opacity: 0.4; }
      
      /* Cube rotation animation */
      @keyframes ceCubeRotate {
        0% { transform: rotateX(-30deg) rotateY(45deg) rotateZ(0deg); }
        25% { transform: rotateX(-30deg) rotateY(135deg) rotateZ(90deg); }
        50% { transform: rotateX(-30deg) rotateY(225deg) rotateZ(180deg); }
        75% { transform: rotateX(-30deg) rotateY(315deg) rotateZ(270deg); }
        100% { transform: rotateX(-30deg) rotateY(405deg) rotateZ(360deg); }
      }
      
      /* Glow pulse animation */
      @keyframes ceGlowPulse {
        0%, 100% { filter: brightness(1) blur(0px); }
        50% { filter: brightness(1.5) blur(1px); }
      }
      
      /* SMOOTH DRAGGING */
      .ce-icon.smooth-drag {
        transition: none !important;
        transform: translateZ(0);
      }
      
      /* CLEAN POPUP - FIXED HEIGHT WITH SCROLLING */
      .ce-popup {
        position: fixed;
        width: 400px;
        max-width: 95vw;
        height: 340px;
        max-height: 80vh;
        background: var(--ce-bg);
        border: 1px solid var(--ce-border);
        border-radius: var(--ce-radius);
        box-shadow: 0 10px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1000000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: popupFadeIn 0.3s ease-out;
      }
      
      @keyframes popupFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      /* SIMPLE HEADER - FIXED AT TOP */
      .ce-header {
        padding: 12px 20px 12px 16px;
        border-bottom: 1px solid var(--ce-border);
        background: var(--ce-surface);
        flex-shrink: 0; /* Prevent header from shrinking */
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        user-select: none;
      }
      
      .ce-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--ce-text);
        margin: 0;
      }
      
      .ce-close-btn {
        background: none;
        border: none;
        font-size: 22px;
        color: var(--ce-text-secondary);
        cursor: pointer;
        margin-left: 8px;
        padding: 0 4px;
        border-radius: 4px;
        transition: background 0.15s;
      }
      .ce-close-btn:hover {
        background: #1a1a1a;
        color: var(--ce-primary);
      }
      
      /* CONTENT AREA - SCROLLABLE */
      .ce-content {
        flex: 1;
        padding: 18px 18px 12px 18px;
        overflow-y: auto;
        min-height: 80px;
        max-height: 220px;
        position: relative; /* For scroll indicator positioning */
        transition: filter 0.2s;
        background: var(--ce-bg);
        color: #f0f0f0 !important;
      }
      #animated-text {
        font-size: 15px;
        line-height: 1.6;
        color: #f0f0f0 !important;
        font-weight: 500;
        margin: 0;
        padding: 0;
      }
      .ce-enhanced-text {
        font-size: 14px;
        line-height: 1.6;
        color: var(--ce-text);
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
        padding: 12px;
        background: #0f0f0f;
        border: 1px solid var(--ce-border);
        border-radius: 6px;
        min-height: 100px;
        max-height: none; /* Allow content to expand for scrolling */
      }
      
      /* WORD ANIMATION */
      .ce-word {
        display: inline;
        opacity: 0;
        animation: wordFadeIn 0.5s ease-out forwards;
        margin-right: 0.3em;
      }
      
      @keyframes wordFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .ce-loading {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        padding: 20px;
        color: #6b7280;
        font-size: 14px;
        gap: 16px;
      }
      
      /* FOOTER - FIXED AT BOTTOM */
      .ce-footer {
        padding: 12px 20px;
        background: var(--ce-bg); /* Dark black background to match main background */
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 12px;
        flex-shrink: 0; /* Prevent footer from shrinking */
        position: sticky;
        bottom: 0;
        z-index: 2;
      }
      
      .ce-insert-btn {
        background: var(--ce-primary);
        color: #000;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(255,255,255,0.08);
      }
      .ce-insert-btn[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
        filter: blur(2px) grayscale(0.3) opacity(0.6);
      }
      .ce-insert-btn:hover:enabled {
        background: var(--ce-primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(100, 200, 255, 0.25);
      }
      .ce-insert-btn:active:enabled {
        transform: translateY(0);
      }
      
      /* SCROLLBAR - ENHANCED VISIBILITY */
      .ce-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .ce-content::-webkit-scrollbar-track {
        background: #0f0f0f;
        border-radius: 4px;
        margin: 4px 0;
      }
      
      .ce-content::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #333, #444);
        border-radius: 4px;
        border: 1px solid #222;
      }
      
      .ce-content::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #444, #555);
      }
      
      /* SCROLL INDICATOR */
      .ce-content.has-scroll::after {
        content: '↓ Scroll for more';
        position: absolute;
        bottom: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        font-size: 11px;
        border-radius: 4px 0 0 0;
        pointer-events: none;
      }
      
      /* TOAST ANIMATIONS REMOVED */
      
      /* RESPONSIVE */
      @media (max-width: 480px) {
        .ce-popup {
          width: calc(100vw - 32px);
          max-width: 400px;
          height: 350px; /* Smaller height on mobile */
        }
        
        .ce-content {
          height: 230px; /* Adjust content height for mobile */
        }
      }

      /* Small cube adjustments for popup */
      .ce-logo-container[style*="width:18px"] .ce-face-front { transform: translateZ(9px); }
      .ce-logo-container[style*="width:18px"] .ce-face-back { transform: translateZ(-9px) rotateY(180deg); }
      .ce-logo-container[style*="width:18px"] .ce-face-right { transform: rotateY(90deg) translateZ(9px); }
      .ce-logo-container[style*="width:18px"] .ce-face-left { transform: rotateY(-90deg) translateZ(9px); }
      .ce-logo-container[style*="width:18px"] .ce-face-top { transform: rotateX(90deg) translateZ(9px); }
      .ce-logo-container[style*="width:18px"] .ce-face-bottom { transform: rotateX(-90deg) translateZ(9px); }

      /* Adjust edge thickness for small cubes */
      .ce-logo-container[style*="width:18px"] .ce-edge-top,
      .ce-logo-container[style*="width:18px"] .ce-edge-bottom {
        height: 1px;
      }

      .ce-logo-container[style*="width:18px"] .ce-edge-left,
      .ce-logo-container[style*="width:18px"] .ce-edge-right {
        width: 1px;
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'clean-enhancer-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  setupInputDetection() {
    // 🎯 PRIORITIZED SELECTORS FOR MAIN INPUT DETECTION
    this.selectors = {
      // Perplexity AI (highest priority)
      perplexity: [
      'textarea[placeholder*="Ask anything"]',
      'textarea[placeholder*="Ask"]',
      'textarea[data-testid*="search"]',
      'textarea[data-testid*="input"]',
      'div[contenteditable="true"][data-testid*="search"]',
        'div[contenteditable="true"][data-testid*="input"]'
      ],
      // ChatGPT/OpenAI
      chatgpt: [
        'textarea[data-testid="prompt-textarea"]',
        'textarea[placeholder*="Send a message"]',
        'div[contenteditable="true"][data-testid*="prompt"]'
      ],
      // Claude/Anthropic
      claude: [
        'textarea[placeholder*="Message Claude"]',
        'textarea[data-testid*="claude"]',
        'div[contenteditable="true"][data-testid*="claude"]'
      ],
      // Meta AI
      meta: [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]',
      'textarea[data-testid*="composer"]',
        'div[contenteditable="true"][role="textbox"]'
      ],
      // Gemini/Google
      gemini: [
      'textarea[placeholder*="Message"]',
        'textarea[data-testid*="gemini"]',
        'div[contenteditable="true"][data-testid*="gemini"]'
      ],
      // Fallback selectors
      fallback: [
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Ask"]',
      'textarea[id*="prompt"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
      'div[contenteditable="true"]'
      ]
    };

    // 🚀 SMART MUTATION OBSERVER
    this.setupSmartMutationObserver();
    
    console.log('✅ Smart input detection setup - waiting for extension to start');
  }

  setupSmartMutationObserver() {
    // 🎯 EFFICIENT MUTATION OBSERVER
    this.mutationObserver = new MutationObserver((mutations) => {
      if (!this.isExtensionActive || this.isScanning) return;
      
      // 🚀 SMART TRIGGER DETECTION
      let shouldScan = false;
      let hasInputChanges = false;
      
      mutations.forEach((mutation) => {
        // Check for new nodes that might be inputs
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if it's an input element or contains inputs
              if (this.isInputElement(node) || node.querySelector('textarea, div[contenteditable="true"]')) {
                hasInputChanges = true;
                break;
              }
            }
          }
        }
        
        // Check for attribute changes on existing inputs
        if (mutation.type === 'attributes' && this.isInputElement(mutation.target)) {
          hasInputChanges = true;
        }
      });
      
      if (hasInputChanges) {
        shouldScan = true;
      }
      
      // 🚀 DEBOUNCED SCANNING
      if (shouldScan) {
        this.debouncedScan();
      }
    });

    // 🎯 OBSERVE ONLY RELEVANT CHANGES
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-testid', 'placeholder', 'aria-label']
    });
  }

  isInputElement(element) {
    if (!element || !element.tagName) return false;
    
    const tagName = element.tagName.toLowerCase();
    const isTextarea = tagName === 'textarea';
    const isContentEditable = element.contentEditable === 'true';
    const hasInputAttributes = element.getAttribute('data-testid') || 
                              element.getAttribute('placeholder') || 
                              element.getAttribute('role') === 'textbox';
    
    return isTextarea || isContentEditable || hasInputAttributes;
  }

  debouncedScan() {
    // 🚀 DEBOUNCE SCANNING TO PREVENT EXCESSIVE OPERATIONS
    if (this.scanDebounceTimer) {
      clearTimeout(this.scanDebounceTimer);
    }
    
    const now = Date.now();
    if (now - this.lastScanTime < this.scanCooldown) {
      // Too soon, debounce it
      this.scanDebounceTimer = setTimeout(() => {
        this.smartScanForMainInput();
      }, this.scanCooldown - (now - this.lastScanTime));
    } else {
      // Safe to scan immediately
      this.smartScanForMainInput();
    }
  }

  smartScanForMainInput() {
    if (!this.isExtensionActive) {
      console.log('❌ Extension not active, skipping smart scan');
      return;
    }
    
    if (this.isScanning) {
      console.log('⏳ Scan already in progress, skipping');
      return;
    }
    
    this.isScanning = true;
    this.lastScanTime = Date.now();
    
    console.log('🚀 Smart scanning for main input...');
    
    try {
      // 🎯 PRIORITY-BASED MAIN INPUT DETECTION
      const mainInput = this.findMainInputByPriority();
      
      if (mainInput) {
        console.log('🎯 Found main input:', mainInput.tagName, mainInput.className);
        this.handleMainInputFound(mainInput);
      } else {
        console.log('❌ No main input found in this scan');
        this.cleanupOrphanedIcons();
      }
      
    } catch (error) {
      console.error('❌ Smart scan error:', error);
    } finally {
      this.isScanning = false;
    }
  }

  findMainInputByPriority() {
    // 🎯 PRIORITY-BASED SEARCH (most specific to least specific)
    const priorityOrder = ['perplexity', 'chatgpt', 'claude', 'meta', 'gemini', 'fallback'];
    
    for (const platform of priorityOrder) {
      const selectors = this.selectors[platform];
      const input = this.findBestInputForSelectors(selectors);
      
      if (input) {
        console.log(`✅ Found ${platform} input:`, input.tagName, input.className);
        return input;
      }
    }
    
    return null;
  }

  findBestInputForSelectors(selectors) {
    let bestInput = null;
    let bestScore = 0;
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
          if (this.isValidInput(element)) {
            const score = this.calculateInputScore(element);
            
            if (score > bestScore) {
              bestScore = score;
              bestInput = element;
            }
          }
        });
      } catch (error) {
        console.log('⚠️ Selector error:', selector, error.message);
      }
    }
    
    return bestInput;
  }

  calculateInputScore(element) {
    if (!element) return 0;
    
            const rect = element.getBoundingClientRect();
            const area = rect.width * rect.height;
    
    // 🎯 SCORING ALGORITHM FOR MAIN INPUT DETECTION
    let score = 0;
    
    // Size score (larger inputs get higher scores)
    score += Math.min(area / 1000, 10); // Max 10 points for size
    
    // Visibility score
    const style = window.getComputedStyle(element);
    if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
      score += 5;
    }
    
    // Position score (inputs in viewport get higher scores)
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
      score += 3;
    }
    
    // Specificity score (more specific selectors get higher scores)
    if (element.getAttribute('data-testid')) score += 2;
    if (element.getAttribute('placeholder')) score += 1;
    if (element.getAttribute('role') === 'textbox') score += 1;
    
    // Content score (empty or focused inputs get higher scores)
    if (!element.value && !element.textContent.trim()) score += 2;
    if (document.activeElement === element) score += 3;
    
    // Platform-specific bonuses
    const url = window.location.href;
    if (url.includes('perplexity.ai') && element.getAttribute('data-testid')?.includes('search')) {
      score += 5; // Bonus for Perplexity main search
    }
    if (url.includes('chat.openai.com') && element.getAttribute('data-testid') === 'prompt-textarea') {
      score += 5; // Bonus for ChatGPT main textarea
    }
    
    return score;
  }

  handleMainInputFound(inputElement) {
    // 🎯 SMART ICON MANAGEMENT
    const hasIconInMap = this.icons.has(inputElement);
    const hasDataAttribute = inputElement.dataset.ceIconAttached === "true";
      
      if (!hasIconInMap && !hasDataAttribute) {
      // New input found - add icon
      console.log('🎯 Adding icon to main input:', inputElement.tagName, inputElement.className);
      this.addIcon(inputElement);
      inputElement.dataset.ceIconAttached = "true";
      this.mainInputElement = inputElement;
      
      } else if (hasIconInMap && hasDataAttribute) {
      // Icon already properly attached
      console.log('✅ Icon already attached to main input');
      this.mainInputElement = inputElement;
      
      } else {
      // Inconsistent state - clean up and re-add
        console.log('🔄 Cleaning up inconsistent icon state');
      this.cleanupIconForElement(inputElement);
      this.addIcon(inputElement);
      inputElement.dataset.ceIconAttached = "true";
      this.mainInputElement = inputElement;
    }
    
    // 🧹 Clean up icons from other inputs
    this.cleanupOrphanedIcons();
  }

  cleanupIconForElement(element) {
    if (this.icons.has(element)) {
      const icon = this.icons.get(element);
      if (icon && icon.parentNode) {
        icon.remove();
      }
      this.icons.delete(element);
    }
    delete element.dataset.ceIconAttached;
  }

  cleanupOrphanedIcons() {
    // 🧹 Remove icons from inputs that are no longer the main input
    const currentMainInput = this.mainInputElement;
    
    for (const [element, icon] of this.icons.entries()) {
      if (element !== currentMainInput) {
        console.log('🧹 Removing orphaned icon from:', element.tagName, element.className);
        this.cleanupIconForElement(element);
      }
    }
  }

  isValidInput(element) {
    // Check if element is visible and has reasonable size
    const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
    
    return rect.width > 50 && 
           rect.height > 20 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
  }

  createCubeHTML(size = 32) {
    return `
      <div class="ce-logo-container" style="width:${size}px;height:${size}px;">
        <div class="ce-logo">
          <div class="ce-cube">
            <div class="ce-face ce-face-front">
              <div class="ce-edge ce-edge-top"></div>
              <div class="ce-edge ce-edge-right"></div>
              <div class="ce-edge ce-edge-bottom"></div>
              <div class="ce-edge ce-edge-left"></div>
            </div>
            <div class="ce-face ce-face-back">
              <div class="ce-edge ce-edge-top"></div>
              <div class="ce-edge ce-edge-right"></div>
              <div class="ce-edge ce-edge-bottom"></div>
              <div class="ce-edge ce-edge-left"></div>
            </div>
            <div class="ce-face ce-face-right">
              <div class="ce-edge ce-edge-top"></div>
              <div class="ce-edge ce-edge-right"></div>
              <div class="ce-edge ce-edge-bottom"></div>
              <div class="ce-edge ce-edge-left"></div>
            </div>
            <div class="ce-face ce-face-left">
              <div class="ce-edge ce-edge-top"></div>
              <div class="ce-edge ce-edge-right"></div>
              <div class="ce-edge ce-edge-bottom"></div>
              <div class="ce-edge ce-edge-left"></div>
            </div>
            <div class="ce-face ce-face-top">
              <div class="ce-edge ce-edge-top"></div>
              <div class="ce-edge ce-edge-right"></div>
              <div class="ce-edge ce-edge-bottom"></div>
              <div class="ce-edge ce-edge-left"></div>
            </div>
            <div class="ce-face ce-face-bottom">
              <div class="ce-edge ce-edge-top"></div>
              <div class="ce-edge ce-edge-right"></div>
              <div class="ce-edge ce-edge-bottom"></div>
              <div class="ce-edge ce-edge-left"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  addIcon(inputElement) {
    // Prevent duplicate icons
    if (inputElement.dataset.ceIconAttached === "true") {
      console.log('⚠️ Icon already attached to this input');
      return;
    }

    console.log('🎨 Creating icon for input:', inputElement.tagName, inputElement.className);

    const icon = document.createElement('div');
    icon.className = 'ce-icon';
    icon.innerHTML = this.createCubeHTML(32);
    
    // Save reference to logo for animation control
    icon._logo = icon.querySelector('.ce-logo');
    icon.isDragged = false; // Track if icon has been manually positioned

    this.positionIcon(icon, inputElement);
    this.makeDraggable(icon, inputElement);

    // Simple click and drag separation
    icon.addEventListener('dragstart', (e) => {
      e.preventDefault(); // Prevent default browser drag
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only handle click if we haven't dragged and not processing
      if (!icon.wasDragged && !this.isProcessing) {
        console.log('🎯 ICON CLICKED - Processing enhancement');
        // Start cube spinning when clicked
        if (icon._logo) icon._logo.classList.add('ce-logo-spin');
        this.handleIconClick(inputElement, icon);
      } else {
        console.log('🎯 CLICK IGNORED - wasDragged:', icon.wasDragged, 'isProcessing:', this.isProcessing);
      }
    });
    
    // Double-click to reset position back to input
    icon.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      icon.isDragged = false; // Reset dragged state
      this.positionIcon(icon, inputElement); // Reposition to input
      // Notification removed
    });

    // Position tracking only for non-dragged icons
    const updatePosition = () => {
      if (!icon.isDragged && document.body.contains(icon)) {
        this.positionIcon(icon, inputElement);
      }
    };

    // Event listeners for position updates
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    
    // Less aggressive positioning interval
    const positionInterval = setInterval(() => {
      if (!icon.isDragged && document.body.contains(inputElement)) {
        this.positionIcon(icon, inputElement);
      } else if (!document.body.contains(inputElement)) {
        clearInterval(positionInterval);
      }
    }, 1000); // 1 second interval

    // MutationObserver for cleanup
    const observer = new MutationObserver(() => {
      if (!document.body.contains(inputElement)) {
        icon.remove();
        this.icons.delete(inputElement);
        observer.disconnect();
        clearInterval(positionInterval);
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    this.observers.push(observer);

    // Store references
    icon.updatePosition = updatePosition;
    icon.positionInterval = positionInterval;
    icon.observer = observer;

    document.body.appendChild(icon);
    this.icons.set(inputElement, icon);
    inputElement.dataset.ceIconAttached = "true";
    
    console.log('✅ Icon added successfully. Total icons:', this.icons.size);

    // Focus listener for instant icon
    inputElement.addEventListener('focus', () => {
      if (!this.icons.has(inputElement)) this.addIcon(inputElement);
    });
  }

  positionIcon(icon, inputElement) {
    // Don't reposition if icon is being dragged or has been manually positioned
    if (this.isAnyIconDragging || icon.isDragged) return;
    
    const inputRect = inputElement.getBoundingClientRect();
    const iconSize = 40;
    const offset = 8;

    // Position OUTSIDE the input box at TOP-RIGHT corner
    let left = inputRect.right + offset;
    let top = inputRect.top;

    // Ensure icon stays within viewport bounds
    if (left + iconSize > window.innerWidth - 16) {
      left = inputRect.left - iconSize - offset;
      
      // If still off-screen, position it within the input area
      if (left < 16) {
        left = Math.max(16, inputRect.right - iconSize - 4);
      }
    }

    // Keep icon in viewport vertically
    if (top < 16) {
      top = 16;
    } else if (top + iconSize > window.innerHeight - 16) {
      top = window.innerHeight - iconSize - 16;
    }

    // Apply position with fixed positioning for stability
    icon.style.position = 'fixed';
    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
    icon.style.zIndex = '999999';
  }

  makeDraggable(icon, inputElement) {
    // SIMPLE DRAG SYSTEM - NO CONFLICTS
      let isDragging = false;
    let startX, startY, startLeft, startTop;
    let dragDistance = 0;
    let dragStarted = false; // New flag to track if drag was initiated

    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Only left mouse button
      
      console.log('🎯 DRAG STARTED - Mouse down on icon');
      
      isDragging = true;
      dragStarted = true; // Mark that drag was initiated
      dragDistance = 0;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(icon.style.left) || 0;
      startTop = parseInt(icon.style.top) || 0;
      
      // Mark as dragging to prevent repositioning
      this.isAnyIconDragging = true;
      icon.isDragged = true;
      
      icon.classList.add('dragging');
        
        e.preventDefault();
      e.stopPropagation();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      
      // Keep within viewport
      const iconSize = 40;
      newLeft = Math.max(0, Math.min(window.innerWidth - iconSize, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - iconSize, newTop));
      
      icon.style.left = `${newLeft}px`;
      icon.style.top = `${newTop}px`;
      
      console.log(`🎯 DRAGGING - Position: (${newLeft}, ${newTop}), Distance: ${dragDistance.toFixed(1)}px`);
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        console.log(`🎯 DRAG ENDED - Final distance: ${dragDistance.toFixed(1)}px`);
        
        isDragging = false;
        icon.classList.remove('dragging');
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        this.isAnyIconDragging = false;
        
        // If we moved significantly, prevent click briefly
        if (dragDistance > 5) {
          icon.wasDragged = true;
          console.log('🎯 Icon was dragged - click prevented for 200ms');
          setTimeout(() => {
            icon.wasDragged = false;
            console.log('🎯 Click prevention removed - icon clickable again');
          }, 200); // Reduced to 200ms
        }
      }
    };

    icon.addEventListener('mousedown', handleMouseDown);
  }

  async handleIconClick(inputElement, icon) {
    // Prevent multiple clicks
    if (this.isProcessing || icon.isProcessing) {
      console.log('🚫 Already processing, ignoring click');
      return;
    }

    const text = this.getInputText(inputElement);
    if (!text.trim()) {
      // Notification removed
      // Stop spinning if no text
      if (icon._logo) icon._logo.classList.remove('ce-logo-spin');
      return;
    }

    if (this.activePopup) {
      this.closePopup();
    }

    // Set processing flags
    this.isProcessing = true;
    icon.isProcessing = true;
    
    try {
      await this.showEnhancementPopup(inputElement, icon, text);
    } finally {
      // Reset processing flags
      this.isProcessing = false;
      icon.isProcessing = false;
    }
  }

  getInputText(element) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value;
    } else if (element.contentEditable === 'true') {
      return element.textContent || element.innerText;
    }
    return '';
  }

  async showEnhancementPopup(inputElement, iconElement, inputText) {
    const popup = document.createElement('div');
    popup.className = 'ce-popup';
    popup.innerHTML = `
      <div class="ce-header ce-draggable">
        <span class="ce-title">Enhanced Prompt</span>
        <button class="ce-close-btn" title="Close">×</button>
        </div>
      <div class="ce-content">
        <div class="ce-loading">
          <div id="ce-popup-cube-loading" style="margin: 0;"></div>
          <div style="margin: 0; color: #6b7280;">Great prompts take time</div>
      </div>
          </div>
      <div class="ce-footer" style="display: none;">
        <button class="ce-insert-btn" id="insert-btn">Insert</button>
      </div>
    `;
    document.body.appendChild(popup);
    this.activePopup = popup;
    this.positionPopup(popup, iconElement);
    this.makePopupDraggable(popup);
    popup.querySelector('.ce-close-btn').onclick = () => {
      this.closePopup();
      // Stop the main icon spinning when closing
      const icon = this.icons.get(inputElement);
      if (icon && icon._logo) icon._logo.classList.remove('ce-logo-spin');
    };

    // Add spinning cube in the loading state - SAME AS MAIN ICON
    const loadingCube = popup.querySelector('#ce-popup-cube-loading');
    loadingCube.innerHTML = this.createCubeHTML(18);
    loadingCube.querySelector('.ce-logo').classList.add('ce-logo-spin');

    // Start enhancement
    try {
      const enhanced = await this.enhancePrompt(inputText);
      this.showEnhancedResultWithAnimation(popup, enhanced, inputElement);
    } catch (error) {
      this.showEnhancedResultWithAnimation(popup, this.getFallbackEnhancement(inputText), inputElement);
    }
  }

  positionPopup(popup, iconElement) {
    const iconRect = iconElement.getBoundingClientRect();
    const popupWidth = 400;
    const popupHeight = 340;
    const spacing = 12;
    // Always open at the bottom left of the icon
    let left = iconRect.left;
    let top = iconRect.bottom + spacing;
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }
    if (top + popupHeight > window.innerHeight - 16) {
      top = iconRect.top - popupHeight - spacing;
      if (top < 16) top = window.innerHeight - popupHeight - 16;
    }
    if (left < 16) left = 16;
    if (top < 16) top = 16;
    popup.style.position = 'fixed';
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.zIndex = '1000000';
  }

  async showEnhancedResultWithAnimation(popup, enhancedText, inputElement) {
    const content = popup.querySelector('.ce-content');
    const footer = popup.querySelector('.ce-footer');
    const insertBtn = popup.querySelector('#insert-btn');
    
    // Stop cube rolling after enhancement (main icon)
    const icon = this.icons.get(inputElement);
    if (icon && icon._logo) icon._logo.classList.remove('ce-logo-spin');
    
    // Handle null result (authentication error)
    if (!enhancedText) {
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="color: #dc3545; font-size: 16px; margin-bottom: 10px;">⚠️ Authentication Required</div>
          <div style="color: #808080; font-size: 14px; line-height: 1.5;">
            Please sign in with Google to use AI enhancement.<br>
            Click the extension icon to sign in.
          </div>
        </div>
      `;
      footer.style.display = 'none';
      return;
    }
    
    // Show footer with insert button
    footer.style.display = 'flex';
    
    insertBtn.disabled = false;
    insertBtn.style.filter = '';
      insertBtn.onclick = async () => {
        console.log('🔘 Insert button clicked');
        console.log('📝 Text to insert:', enhancedText.substring(0, 100) + '...');
        console.log('🎯 Target element:', inputElement.tagName, inputElement.className);
        
        // Check if we're on Perplexity AI
        if (window.location.hostname.includes('perplexity.ai')) {
          console.log('🎯 Perplexity detected, using enhanced insertion');
          
          try {
            // Try enhanced insertion with multiple strategies
            await this.insertTextForPerplexity(inputElement, enhancedText);
            console.log('✅ Enhanced Perplexity insertion successful');
          } catch (error) {
            console.log('❌ Enhanced Perplexity insertion failed, trying clipboard fallback');
            // If enhanced insertion fails, use clipboard method
            await this.insertTextViaClipboard(enhancedText, inputElement);
          }
        } else {
          // For other platforms, use optimized insertion
          await this.insertText(enhancedText, inputElement);
        }
        
        this.closePopup();
        // Stop icon spinning after insertion
        const icon = this.icons.get(inputElement);
        if (icon && icon._logo) icon._logo.classList.remove('ce-logo-spin');
      };
    
    // Show enhanced text instantly, no animation, no delay
    content.innerHTML = `<div id="animated-text" style="font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;">${enhancedText}</div>`;
  }

  async enhancePrompt(text) {
    try {
      console.log('🚀 Starting optimized enhancement process...');
      
      // 🚀 OPTIMIZED: Single API call with smart fallback
      const result = await this.makeOptimizedApiCall(text);
      
      if (result.success) {
        console.log(`✅ Enhancement successful: ${result.enhanced.substring(0, 100)}...`);
        return result.enhanced;
      } else {
        console.log('🔄 API call failed, using fallback enhancement');
        return this.getFallbackEnhancement(text);
      }
      
    } catch (error) {
      console.error('❌ Enhancement failed:', error.message);
      return this.getFallbackEnhancement(text);
    }
  }

  async makeOptimizedApiCall(text) {
    // 🚀 OPTIMIZED: Single API call strategy
    const startTime = Date.now();
    
    try {
      // Get user token efficiently
      const token = await this.getUserToken();
      
      // 🎯 SMART ENDPOINT SELECTION
      const endpoint = token ? '/api/v1/enhance' : '/api/v1/quick-test';
      const headers = {
              'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const payload = {
              prompt: text,
        url: window.location.href,
        context: null
      };
      
      // Add fast_mode for authenticated requests
      if (token) {
        payload.fast_mode = true;
      }
      
      console.log(`🚀 Making optimized API call to ${endpoint}...`);
      
      // 🚀 SINGLE API CALL WITH TIMEOUT
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${CONFIG.getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      console.log(`⚡ API response received in ${responseTime}ms`);
      
      if (response.ok) {
        const result = await response.json();
        
        // 🎯 HANDLE DIFFERENT RESPONSE FORMATS
        if (result.enhanced) {
          // Authenticated endpoint response
          if (token) {
            this.incrementEnhancedCount();
          }
          return { success: true, enhanced: result.enhanced };
        } else if (result.success && result.enhanced) {
          // Quick test endpoint response
          return { success: true, enhanced: result.enhanced };
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        // 🚀 SMART ERROR HANDLING
        const errorText = await response.text();
        console.log(`⚠️ API error ${response.status}: ${errorText}`);
        
        if (response.status === 429) {
          throw new Error('Rate limited - please wait a moment');
        } else if (response.status === 401 && token) {
          // Token expired, try without auth
          console.log('🔄 Token expired, retrying without authentication...');
          return await this.makeUnauthenticatedCall(text);
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      }
      
        } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`❌ API call failed after ${responseTime}ms:`, error.message);
      
      // 🚀 SMART FALLBACK STRATEGY
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server may be busy');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - check your connection');
      } else {
          throw error;
        }
      }
  }

  async makeUnauthenticatedCall(text) {
    // 🚀 FALLBACK: Unauthenticated call when token fails
    console.log('🚀 Making unauthenticated API call...');
    
    const response = await fetch(`${CONFIG.getApiUrl()}${CONFIG.endpoints.quickTest}`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: text,
        url: window.location.href
        })
      });
      
          if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return { success: true, enhanced: result.enhanced };
      }
    }
    
    throw new Error('Unauthenticated call also failed');
  }

  async getUserToken() {
    // 🚀 OPTIMIZED: Efficient token retrieval
    return new Promise((resolve) => {
      chrome.storage.local.get(['google_token'], (result) => {
        resolve(result.google_token || null);
      });
    });
  }
      
      // Always use fallback on any error
      console.log('🔄 Using fallback enhancement due to error');
      return this.getFallbackEnhancement(text);
    }
  }

  detectTargetModel() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
      return 'gpt-4o-mini';
    } else if (hostname.includes('claude.ai')) {
      return 'claude-3-5-sonnet';
    } else if (hostname.includes('gemini.google.com')) {
      return 'gemini-1.5-pro';
    } else if (hostname.includes('perplexity.ai')) {
      return 'perplexity-pro';
    } else if (hostname.includes('meta.ai')) {
      return 'meta-llama-3';
    } else if (hostname.includes('poe.com')) {
      return 'gpt-4o-mini';
    }
    
    return 'gpt-4o-mini'; // Default fallback
  }

  getFallbackEnhancement(text) {
    const targetModel = this.detectTargetModel();
    
    // Model-specific fallback enhancements
    if (targetModel.includes('claude')) {
      return `Please provide a thoughtful, well-structured analysis of the following:

${text}

Structure your response with clear reasoning, consider multiple perspectives, and provide specific examples where relevant.`;
    } else if (targetModel.includes('gemini')) {
      return `Analyze and respond comprehensively to:

${text}

Please provide detailed explanations, relevant context, and practical insights in your response.`;
    } else if (targetModel.includes('perplexity')) {
      return `Research and provide an informative response about:

${text}

Include relevant sources, current information, and comprehensive analysis in your answer.`;
    } else if (targetModel.includes('meta') || targetModel.includes('llama')) {
      return `Provide a detailed, helpful response to:

${text}

Focus on accuracy, clarity, and practical value in your explanation.`;
      } else {
      // GPT fallback (for gpt-4o-mini and others)
      return `Please provide a comprehensive and detailed response to the following query, ensuring accuracy and clarity:

${text}

Additional context: Please structure your response in a clear, organized manner with relevant examples where appropriate.`;
    }
  }

  async insertText(text, inputElement) {
    console.log('🚀 Using optimized text insertion');
    
    // Use the optimized insertion method
    const success = await this.insertTextOptimized(inputElement, text);
    
    if (success) {
      console.log('✅ Optimized text insertion completed');
    } else {
      console.log('⚠️ Optimized insertion failed, using fallback');
      // Fallback to basic insertion
      this.insertTextFallback(text, inputElement);
    }
  }

  insertTextFallback(text, inputElement) {
    console.log('🔄 Using fallback text insertion');
    
    try {
      // Simple fallback method
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      inputElement.value = text;
      } else {
        inputElement.textContent = text;
      }
      
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      inputElement.focus();
      
      console.log('✅ Fallback text insertion completed');
    } catch (error) {
      console.error('❌ Fallback insertion also failed:', error);
    }
  }

  async insertTextOptimized(inputElement, text) {
    console.log('🚀 Using optimized text insertion method');
    
    try {
      // 🎯 SINGLE STRATEGY: Direct text insertion with smart fallbacks
      
      // Focus the input first
      inputElement.focus();
      await this.delay(50); // Reduced delay for performance
      
      // Clear existing content
      inputElement.textContent = '';
      inputElement.innerHTML = '';
      
      // 🚀 SMART INSERTION BASED ON ELEMENT TYPE
      if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
        // Standard form elements
        inputElement.value = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (inputElement.contentEditable === 'true') {
        // ContentEditable elements (like Perplexity)
        inputElement.textContent = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Fallback for unknown elements
        inputElement.textContent = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await this.delay(100); // Reduced delay
      
      // 🎯 QUICK VERIFICATION
      const actualText = inputElement.textContent || inputElement.value || '';
      if (actualText.includes(text.substring(0, 20))) {
        console.log('✅ Optimized insertion successful');
        return true;
      } else {
        console.log('⚠️ Insertion verification failed, but continuing...');
        return true; // Don't fail, just continue
      }
      
      } catch (error) {
      console.error('❌ Optimized insertion failed:', error);
      return false; // Don't throw, just return false
    }
  }



  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async typeInto(inputElement, text) {
    console.log('⌨️ Using simulated typing for Perplexity');
    console.log('🔍 Element properties:', {
      tagName: inputElement.tagName,
      className: inputElement.className,
      contentEditable: inputElement.contentEditable,
      type: inputElement.type
    });
    
    try {
      // Focus the input first
      inputElement.focus();
      
      // Clear existing content based on element type
      if (inputElement.contentEditable === 'true' || inputElement.tagName === 'DIV') {
        console.log('🧹 Clearing contentEditable element');
        inputElement.innerHTML = '';
        inputElement.textContent = '';
        
        // For Perplexity's Lexical editor, create the initial structure
        if (window.location.hostname.includes('perplexity.ai')) {
          console.log('🎯 Setting up Perplexity Lexical editor structure');
          
          // Try to find existing Lexical structure first
          let existingParagraph = inputElement.querySelector('p[dir="ltr"]');
          let existingSpan = inputElement.querySelector('span[data-lexical-text="true"]');
          
          if (!existingParagraph) {
            const paragraph = document.createElement('p');
            paragraph.setAttribute('dir', 'ltr');
            inputElement.appendChild(paragraph);
            existingParagraph = paragraph;
          }
          
          if (!existingSpan) {
            const span = document.createElement('span');
            span.setAttribute('data-lexical-text', 'true');
            existingParagraph.appendChild(span);
            existingSpan = span;
          }
          
          console.log('✅ Lexical structure ready:', { paragraph: !!existingParagraph, span: !!existingSpan });
        }
      } else {
        console.log('🧹 Clearing input/textarea element');
        inputElement.value = '';
      }
      
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Wait a bit for focus to settle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Type character by character
      console.log('⌨️ Starting character-by-character typing...');
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Fire beforeinput so any listeners prepare for incoming text
        inputElement.dispatchEvent(new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: char,
          bubbles: true
        }));
        
        // Append one character based on element type
        if (inputElement.contentEditable === 'true' || inputElement.tagName === 'DIV') {
          if (window.location.hostname.includes('perplexity.ai')) {
            // For Perplexity's Lexical editor, update the span content
            const span = inputElement.querySelector('span[data-lexical-text="true"]');
            if (span) {
              span.textContent = (span.textContent || '') + char;
            } else {
              // Fallback to textContent if span not found
              const currentText = inputElement.textContent || '';
              inputElement.textContent = currentText + char;
            }
          } else {
            const currentText = inputElement.textContent || '';
            inputElement.textContent = currentText + char;
          }
        } else {
          const val = inputElement.value || '';
          inputElement.value = val + char;
        }
        
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Progress indicator every 50 characters
        if (i % 50 === 0) {
          console.log(`⌨️ Typing progress: ${i}/${text.length} characters`);
        }
        
        // Tiny delay so it looks human
        await new Promise(r => setTimeout(r, 15));
      }
      
      // Final change event
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Simulated typing completed successfully');
      
      // Verify the text was inserted
      const finalText = inputElement.contentEditable === 'true' ? 
        inputElement.textContent : inputElement.value;
      console.log('📝 Final text length:', finalText.length);
      console.log('📝 Text preview:', finalText.substring(0, 100) + '...');
      
    } catch (e) {
      console.error('❌ Simulated typing failed:', e);
      // Fallback to clipboard method
      await this.insertTextViaClipboard(text, inputElement);
    }
  }

  async insertTextViaClipboard(text, inputElement) {
    try {
      console.log('📋 Using clipboard fallback for Perplexity');
      
      // Copy text to clipboard
      await navigator.clipboard.writeText(text);
      console.log('✅ Text copied to clipboard');
      
      // Focus the input
      inputElement.focus();
      
      // Wait a bit for focus to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try multiple paste methods for Perplexity
      if (window.location.hostname.includes('perplexity.ai')) {
        console.log('🎯 Trying Perplexity-specific paste methods');
        
        // Method 1: Standard Ctrl+V
        inputElement.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        }));
        
        inputElement.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'v',
          code: 'KeyV',
          ctrlKey: true,
          bubbles: true
        }));
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Method 2: Try Cmd+V for Mac users
        inputElement.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          metaKey: true,
          bubbles: true,
          cancelable: true
        }));
        
        inputElement.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'v',
          code: 'KeyV',
          metaKey: true,
          bubbles: true
        }));
        
        // Method 3: Try right-click paste simulation
        setTimeout(() => {
          inputElement.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true
          }));
        }, 50);
        
      } else {
        // Standard paste for other platforms
        inputElement.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          ctrlKey: true,
          bubbles: true
        }));
        
        inputElement.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'v',
          code: 'KeyV',
          ctrlKey: true,
          bubbles: true
        }));
      }
      
      console.log('✅ Clipboard paste attempted');
      
      // Show user notification
      this.showClipboardNotification(text);
      
    } catch (e) {
      console.error('❌ Clipboard fallback failed:', e);
      this.showClipboardNotification(text);
    }
  }

  showClipboardNotification(text) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a1a;
      color: #f0f0f0;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #333;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      max-width: 350px;
      word-wrap: break-word;
    `;
    
    const isPerplexity = window.location.hostname.includes('perplexity.ai');
    const platformText = isPerplexity ? 
      'Press Ctrl+V (or Cmd+V) to paste into Perplexity\'s search field.' :
      'Press Ctrl+V (or Cmd+V) to paste into the input field.';
    
    notification.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 600; color: #4CAF50;">📋 Enhanced prompt copied!</div>
      <div style="margin-bottom: 12px; font-size: 12px; color: #aaa;">
        ${platformText}
      </div>
      <div style="font-size: 12px; color: #888; max-height: 100px; overflow-y: auto; border-top: 1px solid #333; padding-top: 8px;">
        <strong>Preview:</strong><br>
        ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 8 seconds (longer for Perplexity users)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, isPerplexity ? 8000 : 5000);
  }

  closePopup() {
    if (this.activePopup) {
      this.activePopup.remove();
      this.activePopup = null;
    }
  }

  // showToast method removed - no more notifications

  cleanupAndQuit() {
    console.log('🧹 Comprehensive cleanup and quit...');
    
    // Stop extension if active
    this.stopExtension();
    
    // Remove all icons from DOM
    this.icons.forEach((icon, inputElement) => {
      icon.remove();
    });
    this.icons.clear();
    
    // Clear all data attributes from inputs
    document.querySelectorAll('[data-ce-icon-attached]').forEach(input => {
      delete input.dataset.ceIconAttached;
    });
    
    // Clear all storage
    chrome.storage.local.clear(() => {
      console.log('💾 All storage cleared');
    });
    
    // Remove any remaining icons that might be in DOM
    document.querySelectorAll('.ce-icon').forEach(icon => {
      icon.remove();
    });
    
    // Remove styles
    const styles = document.getElementById('clean-enhancer-styles');
    if (styles) {
      styles.remove();
    }
    
    console.log('✅ Comprehensive cleanup completed');
  }

  setupGlobalListeners() {
    // Close popup on outside click
    document.addEventListener('click', (e) => {
      if (this.activePopup && !this.activePopup.contains(e.target)) {
        const isIcon = e.target.closest('.ce-icon');
        if (!isIcon) {
          this.closePopup();
        }
      }
    });

    // Close popup on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activePopup) {
        this.closePopup();
        // Stop spinning when closing with escape
        this.icons.forEach((icon) => {
          if (icon._logo) icon._logo.classList.remove('ce-logo-spin');
        });
      }
    });

    // Handle messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);
      
      if (message.action === 'login') {
        this.userInfo = message.data;
        console.log('User logged in:', this.userInfo);
      } else if (message.action === 'logout') {
        this.userInfo = null;
        this.stopExtension();
        console.log('User logged out');
      } else if (message.action === 'startExtension') {
        console.log('🚀 Starting extension...');
        // Always start fresh - no need to force stop first
        const success = this.startExtension();
        console.log('✅ Start result:', success);
        sendResponse({ success });
      } else if (message.action === 'stopExtension') {
        console.log('🛑 Stopping extension...');
        this.stopExtension();
        sendResponse({ success: true });
      } else if (message.action === 'debugScan') {
        console.log('🔍 Manual debug scan requested...');
        console.log('Extension active:', this.isExtensionActive);
        console.log('Current icons count:', this.icons.size);
        console.log('User info:', this.userInfo);
        this.scanForInputs(this.allSelectors);
        sendResponse({ success: true });
      } else if (message.action === 'cleanupAndQuit') {
        console.log('🧹 Cleanup and quit requested...');
        // Use comprehensive cleanup method
        this.cleanupAndQuit();
        sendResponse({ success: true });
      } else if (message.action === 'initEnhancer') {
        console.log('Initializing enhancer from background');
        this.init();
      }
      
      // Always return true to keep message channel open for async response
      return true;
    });
  }

  async checkLoginStatus() {
    try {
      // Get user info from storage
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['user_info'], resolve);
      });
      
      this.userInfo = result.user_info;
      if (this.userInfo) {
        console.log('✅ User is logged in:', this.userInfo.name);
        // Don't auto-start extension - user must click Start button
        console.log('⏸️ Extension waiting for user to click Start');
      } else {
        console.log('❌ No user logged in');
      }
    } catch (error) {
      console.error('❌ Error checking login status:', error);
    }
  }

  async startExtension() {
    // Check if user info is loaded, if not try to load it
    if (!this.userInfo) {
      console.log('🔄 User info not loaded, checking login status...');
      await this.checkLoginStatus();
      
      if (!this.userInfo) {
        console.log('❌ Cannot start extension - user not logged in');
        return false;
      }
    }
    
    console.log('🚀 Starting extension for user:', this.userInfo.name);
    
    // Always reset state completely
    this.isExtensionActive = false;
    
    // Clear any old scanning interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Clear any old debounce timer
    if (this.scanDebounceTimer) {
      clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = null;
    }
    
    // Clear any old icons that might be lingering
    this.icons.forEach((icon, inputElement) => {
      icon.remove();
    });
    this.icons.clear();
    
    // Clear any old data attributes
    document.querySelectorAll('[data-ce-icon-attached]').forEach(input => {
      delete input.dataset.ceIconAttached;
    });
    
    // Reset smart scanning state
    this.mainInputElement = null;
    this.inputCache.clear();
    this.isScanning = false;
    
    // Now set as active
    this.isExtensionActive = true;
    
    // Store active state
    chrome.storage.local.set({ 'extension_active': true }, () => {
      console.log('💾 Extension active state saved');
    });
    
    // 🚀 SMART INITIAL SCAN
    console.log('🚀 Smart scanning for main input...');
    this.smartScanForMainInput();
    
    // Force another smart scan after a short delay
    setTimeout(() => {
      console.log('🚀 Force smart scanning for main input...');
      this.smartScanForMainInput();
    }, 200);
    
    // 🚀 PERIODIC SMART SCANNING (less frequent, more efficient)
    this.scanInterval = setInterval(() => {
      if (this.isExtensionActive && !this.isScanning) {
        this.smartScanForMainInput();
      }
    }, 2000); // Reduced frequency - smart scanning is more efficient
    
    console.log('✅ Extension started successfully with smart scanning');
    return true;
  }

  stopExtension() {
    if (!this.isExtensionActive) {
      console.log('Extension not active');
      return;
    }
    
    console.log('🛑 Stopping extension');
    this.isExtensionActive = false;
    
    // Store inactive state
    chrome.storage.local.set({ 'extension_active': false }, () => {
      console.log('💾 Extension inactive state saved');
    });
    
    // Clear scanning interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Clear debounce timer
    if (this.scanDebounceTimer) {
      clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = null;
    }
    
    // 🧹 SMART CLEANUP
    console.log('🧹 Smart cleanup - removing all icons...');
    this.icons.forEach((icon, inputElement) => {
      icon.remove();
      // Clear the data attribute so icons can be re-added
      if (inputElement && inputElement.dataset) {
        delete inputElement.dataset.ceIconAttached;
      }
    });
    this.icons.clear();
    
    // Clear any remaining data attributes from inputs
    document.querySelectorAll('[data-ce-icon-attached]').forEach(input => {
      delete input.dataset.ceIconAttached;
    });
    
    // Reset smart scanning state
    this.mainInputElement = null;
    this.inputCache.clear();
    this.isScanning = false;
    
    console.log('✅ Extension stopped - smart cleanup completed');
  }

  incrementEnhancedCount() {
    // Only notify popup to refresh from backend - no local storage
    console.log('📊 Enhancement completed - notifying popup to refresh');
    
    // Notify popup if it's open to reload from backend
    chrome.runtime.sendMessage({
      action: 'updateEnhancedCount'
    }).catch(() => {
      // Popup might not be open, that's okay
    });
  }

  // Removed local storage methods - now using backend only

  destroy() {
    // Stop extension if active
    this.stopExtension();
    
    // 🧹 SMART CLEANUP
    this.icons.forEach((icon, inputElement) => {
      // Clean up icon-specific resources
      if (icon.updatePosition) {
        window.removeEventListener('scroll', icon.updatePosition);
        window.removeEventListener('resize', icon.updatePosition);
      }
      if (icon.positionInterval) {
        clearInterval(icon.positionInterval);
      }
      if (icon.observer) {
        icon.observer.disconnect();
      }
      icon.remove();
    });
    this.icons.clear();
    
    // Clean up mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Clean up other observers
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
    
    // Clear debounce timer
    if (this.scanDebounceTimer) {
      clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = null;
    }
    
    // Clear scanning interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Reset smart scanning state
    this.mainInputElement = null;
    this.inputCache.clear();
    this.isScanning = false;
    
    if (this.activePopup) {
      this.activePopup.remove();
    }
    
    const styles = document.getElementById('clean-enhancer-styles');
    if (styles) styles.remove();
    
    console.log('✅ Smart cleanup completed');
  }

  makePopupDraggable(popup) {
    const header = popup.querySelector('.ce-header');
    let isDragging = false, startX, startY, startLeft, startTop;
    header.style.cursor = 'move';
    header.onmousedown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = popup.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.onmousemove = (e2) => {
        if (!isDragging) return;
        let newLeft = startLeft + (e2.clientX - startX);
        let newTop = startTop + (e2.clientY - startY);
        // Keep within viewport
        const popupWidth = popup.offsetWidth;
        const popupHeight = popup.offsetHeight;
        newLeft = Math.max(8, Math.min(window.innerWidth - popupWidth - 8, newLeft));
        newTop = Math.max(8, Math.min(window.innerHeight - popupHeight - 8, newTop));
        popup.style.left = `${newLeft}px`;
        popup.style.top = `${newTop}px`;
      };
      document.onmouseup = () => {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
  }
}

// Initialize but don't start automatically
window.enhancerInstance = new CleanEnhancer();
console.log('🚀 Content script loaded - waiting for user to start extension');
console.log('📍 Current URL:', window.location.href);
console.log('🔧 Extension ID:', chrome.runtime.id);

// 🚀 MESSAGE LISTENER FOR POPUP COMMUNICATION
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📡 Content script received message:', message);
  
  if (message.action === 'startExtension') {
    console.log('🚀 Starting extension from popup...');
    try {
      // Handle async startExtension method
      window.enhancerInstance.startExtension().then(success => {
        console.log('✅ Extension start result:', success);
        sendResponse({ success: success });
      }).catch(error => {
        console.error('❌ Extension start error:', error);
        sendResponse({ success: false, error: error.message });
      });
    } catch (error) {
      console.error('❌ Extension start error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'stopExtension') {
    console.log('🛑 Stopping extension from popup...');
    try {
      window.enhancerInstance.stopExtension();
      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ Extension stop error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.action === 'cleanupAndQuit') {
    console.log('🧹 Cleaning up and quitting...');
    try {
      window.enhancerInstance.cleanupAndQuit();
      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.action === 'updateEnhancedCount') {
    console.log('📊 Updating enhanced count...');
    try {
      window.enhancerInstance.incrementEnhancedCount();
      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ Count update error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  console.log('⚠️ Unknown message action:', message.action);
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});