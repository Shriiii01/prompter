// 🚀 CLEAN PROMPT ENHANCER - WITH 3D GLOWING CUBE
console.log('🚀 Clean Prompt Enhancer - Loading...');

// Prevent multiple instances
if (window.enhancerInstance) {
  window.enhancerInstance.destroy();
}

class CleanEnhancer {
  constructor() {
    this.icons = new Map();
    this.activePopup = null;
    this.isProcessing = false;
    this.observers = [];
    this.dragData = null;
    this.isAnyIconDragging = false;
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.setupInputDetection();
    this.setupGlobalListeners();
    // Reduce scan interval for faster icon appearance
    setInterval(() => {
      this.scanForInputs([
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea[data-testid*="composer"]',
        'textarea[aria-label*="Message"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][data-testid*="composer"]',
        'div[contenteditable="true"][aria-label*="Message"]',
        'textarea.x1i10hfl',
        'div.x1i10hfl[contenteditable="true"]',
        'textarea',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Send a message"]',
        'textarea[placeholder*="Message"]',
        'textarea[data-testid="prompt-textarea"]',
        'textarea[id*="prompt"]',
        'div[contenteditable="true"][data-testid*="prompt"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea',
        'div[contenteditable="true"]'
      ]);
    }, 500); // 500ms for faster icon appearance
    console.log('✅ Clean Enhancer initialized');
  }

  injectStyles() {
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
      }
      
      .ce-icon:active,
      .ce-icon.dragging {
        cursor: grabbing;
        transform: scale(1.05) translateZ(0);
        transition: none;
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
      
      /* TOAST ANIMATIONS */
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
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
    // Meta AI selectors (comprehensive)
    const metaAISelectors = [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]',
      'textarea[data-testid*="composer"]',
      'textarea[aria-label*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-testid*="composer"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'textarea.x1i10hfl',
      'div.x1i10hfl[contenteditable="true"]',
      'textarea',
      'div[contenteditable="true"]'
    ];

    // Other AI platform selectors
    const otherSelectors = [
      'textarea[placeholder*="Send a message"]',
      'textarea[placeholder*="Message"]',
      'textarea[data-testid="prompt-textarea"]',
      'textarea[id*="prompt"]',
      'div[contenteditable="true"][data-testid*="prompt"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea',
      'div[contenteditable="true"]'
    ];

    const allSelectors = [...metaAISelectors, ...otherSelectors];

    // Detect existing inputs
    this.scanForInputs(allSelectors);

    // Watch for new inputs
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldScan = true;
        }
      });
      
      if (shouldScan) {
        setTimeout(() => this.scanForInputs(allSelectors), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);

    // Periodic check for missed inputs
    setInterval(() => {
      this.scanForInputs(allSelectors);
    }, 2000);
  }

  scanForInputs(selectors) {
    // Only add icon to the main input (largest visible input)
    let largest = null;
    let largestArea = 0;
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isValidInput(element)) {
            const rect = element.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > largestArea) {
              largest = element;
              largestArea = area;
            }
          }
        });
      } catch (e) {}
    });
    if (largest && !largest.dataset.ceIconAttached) {
      this.addIcon(largest);
      largest.dataset.ceIconAttached = "true";
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
    if (inputElement.dataset.ceIconAttached === "true") return;

    const icon = document.createElement('div');
    icon.className = 'ce-icon';
    icon.innerHTML = this.createCubeHTML(32);
    
    // Save reference to logo for animation control
    icon._logo = icon.querySelector('.ce-logo');

    this.positionIcon(icon, inputElement);
    this.makeDraggable(icon, inputElement);

    // --- Sticky icon logic ---
    // Reposition icon on scroll, resize, and at intervals
    const updatePosition = () => {
      if (!icon.isDetached) this.positionIcon(icon, inputElement);
    };
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    // Frequent interval to keep icon stuck to input
    let lastRect = inputElement.getBoundingClientRect();
    const stickyInterval = setInterval(() => {
      const rect = inputElement.getBoundingClientRect();
      // If input moved, reposition icon
      if (
        rect.left !== lastRect.left ||
        rect.top !== lastRect.top ||
        rect.width !== lastRect.width ||
        rect.height !== lastRect.height
      ) {
        icon.isDetached = false;
        this.positionIcon(icon, inputElement);
      }
      lastRect = rect;
    }, 100); // 100ms for high stickiness
    // MutationObserver for DOM changes
    const observer = new MutationObserver(() => {
      if (!document.body.contains(inputElement)) {
        icon.remove();
        this.icons.delete(inputElement);
        observer.disconnect();
        clearInterval(stickyInterval);
      } else {
        updatePosition();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    this.observers.push(observer);

    // Add drag/click separation
    let dragStarted = false;
    icon.addEventListener('mousedown', (e) => {
      dragStarted = false;
      this.dragData = null;
    });
    icon.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) dragStarted = true;
    });
    icon.addEventListener('mouseup', (e) => {
      if (!dragStarted && !this.isProcessing && !this.dragData) {
        // Start cube spinning when clicked
        if (icon._logo) icon._logo.classList.add('ce-logo-spin');
        this.handleIconClick(inputElement, icon);
      }
      dragStarted = false;
    });

    document.body.appendChild(icon);
    this.icons.set(inputElement, icon);
    inputElement.dataset.ceIconAttached = "true";

    // Also scan on focus for instant icon
    inputElement.addEventListener('focus', () => {
      if (!this.icons.has(inputElement)) this.addIcon(inputElement);
    });
  }

  positionIcon(icon, inputElement) {
    if (this.isAnyIconDragging) return;
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
    
    console.log(`🎯 Positioned icon at (${left}, ${top}) for input at (${inputRect.left}, ${inputRect.top})`);
  }

  makeDraggable(icon, inputElement) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, startLeft, startTop;
    let currentMoveHandler, currentUpHandler;

    const handleMouseDown = (e) => {
      this.isAnyIconDragging = true;
      isDragging = true;
      hasMoved = false;
      icon.classList.add('dragging', 'smooth-drag');
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(icon.style.left) || 0;
      startTop = parseInt(icon.style.top) || 0;
      this.dragData = { startTime: Date.now(), moved: false };
      e.preventDefault();
      e.stopPropagation();
      currentMoveHandler = handleMouseMove;
      currentUpHandler = handleMouseUp;
      document.addEventListener('mousemove', currentMoveHandler, { passive: false });
      document.addEventListener('mouseup', currentUpHandler, { passive: false });
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
        this.dragData.moved = true;
      }
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      const iconSize = 40;
      newLeft = Math.max(0, Math.min(window.innerWidth - iconSize, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - iconSize, newTop));
      icon.style.left = `${newLeft}px`;
      icon.style.top = `${newTop}px`;
      icon.isDetached = true;
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        icon.classList.remove('dragging', 'smooth-drag');
        document.removeEventListener('mousemove', currentMoveHandler);
        document.removeEventListener('mouseup', currentUpHandler);
        if (hasMoved) {
          icon.dataset.ceDragged = "true";
          setTimeout(() => { this.dragData = null; }, 200);
        } else {
          this.dragData = null;
        }
        this.isAnyIconDragging = false;
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
      this.showToast('Please enter some text first', 'warning');
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

    // Add spinning cube in the loading state
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
    
    // Show footer with insert button
    footer.style.display = 'flex';
    
    insertBtn.disabled = false;
    insertBtn.style.filter = '';
    insertBtn.onclick = () => {
      this.insertText(enhancedText, inputElement);
      this.closePopup();
      this.showToast('Enhanced prompt inserted!');
      // Stop icon spinning after insertion
      const icon = this.icons.get(inputElement);
      if (icon && icon._logo) icon._logo.classList.remove('ce-logo-spin');
    };
    
    // Stop cube rolling after enhancement (main icon)
    const icon = this.icons.get(inputElement);
    if (icon && icon._logo) icon._logo.classList.remove('ce-logo-spin');
    
    // Show enhanced text instantly, no animation, no delay
    content.innerHTML = `<div id="animated-text" style="font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;">${enhancedText}</div>`;
  }

  async enhancePrompt(text) {
    try {
      // Send prompt to backend - let backend auto-detect model and set system prompts
      const response = await fetch('http://localhost:8000/api/v1/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text,
          url: window.location.href,
          context: null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`⚠️ Backend API failed (${response.status}):`, errorData);
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Enhanced with GPT-4o Mini using backend model detection:`, result);
      
      // Show success notification
      this.showToast(`Enhanced with GPT-4o Mini (${result.model_used || 'auto-detected'})`, 'success');
      
      return result.enhanced;
    } catch (error) {
      console.error('❌ Backend API failed, using fallback:', error.message);
      
      // Show fallback notification
      this.showToast(`Using local enhancement (backend unavailable)`, 'warning');
      
      // Fall back to model-specific local enhancement
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

  insertText(text, inputElement) {
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      inputElement.value = text;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (inputElement.contentEditable === 'true') {
      // Convert markdown tables and newlines to HTML
      let html = text
        // Convert markdown tables to HTML tables (simple version)
        .replace(/\|([^\n]*)\|/g, (row) => {
          const cells = row.split('|').slice(1, -1).map(cell => `<td>${cell.trim()}</td>`).join('');
          return `<tr>${cells}</tr>`;
        })
        .replace(/<tr>.*<\/tr>\n<tr>[-:| ]*<\/tr>/g, '') // Remove markdown table header separator
        .replace(/(<tr>.*<\/tr>)/g, '<table>$1</table>') // Wrap in <table> (naive, but works for single table)
        .replace(/\n/g, '<br>');
      // Remove duplicate <table> tags
      html = html.replace(/(<\/table>)(<table>)+/g, '');
      inputElement.innerHTML = html;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Focus the input
    inputElement.focus();
  }

  closePopup() {
    if (this.activePopup) {
      this.activePopup.remove();
      this.activePopup = null;
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    
    // Different colors for different types
    let backgroundColor;
    switch (type) {
      case 'success':
        backgroundColor = 'linear-gradient(135deg, #10b981, #059669)';
        break;
      case 'error':
        backgroundColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
        break;
      case 'warning':
        backgroundColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
        break;
      default:
        backgroundColor = 'linear-gradient(135deg, #64c8ff, #3b82f6)';
    }
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  setupGlobalListeners() {
    // Close popup on outside click
    document.addEventListener('click', (e) => {
      if (this.activePopup && !this.activePopup.contains(e.target)) {
        const isIcon = e.target.classList.contains('ce-icon');
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
  }

  destroy() {
    // Clean up everything
    this.icons.forEach(icon => icon.remove());
    this.icons.clear();
    
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
    
    if (this.activePopup) {
      this.activePopup.remove();
    }
    
    const styles = document.getElementById('clean-enhancer-styles');
    if (styles) styles.remove();
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

// Initialize
window.enhancerInstance = new CleanEnhancer();