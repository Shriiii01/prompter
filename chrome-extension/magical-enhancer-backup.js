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
    this.userInfo = null;
    this.isExtensionActive = false; // New: Track if extension is active
    
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

    this.allSelectors = [...metaAISelectors, ...otherSelectors];

    // Watch for new inputs (but don't scan automatically)
    const observer = new MutationObserver((mutations) => {
      if (!this.isExtensionActive) return; // Only scan if extension is active
      
      let shouldScan = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldScan = true;
        }
      });
      
      if (shouldScan) {
        setTimeout(() => this.scanForInputs(this.allSelectors), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);

    console.log('✅ Input detection setup - waiting for extension to start');
  }

  scanForInputs(selectors) {
    if (!this.isExtensionActive) {
      console.log('❌ Extension not active, skipping scan');
      return;
    }
    
    console.log('🔍 Scanning for inputs with', selectors.length, 'selectors...');
    
    // Only add icon to the main input (largest visible input)
    let largest = null;
    let largestArea = 0;
    let totalElements = 0;
    let validElements = 0;
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        totalElements += elements.length;
        
        elements.forEach(element => {
          if (this.isValidInput(element)) {
            validElements++;
            const rect = element.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > largestArea) {
              largest = element;
              largestArea = area;
            }
          }
        });
      } catch (e) {
        console.log('⚠️ Error with selector:', selector, e);
      }
    });
    
    console.log(`📊 Found ${totalElements} total elements, ${validElements} valid inputs`);
    
    if (largest) {
      // Check if icon is already attached (both in our map and data attribute)
      const hasIconInMap = this.icons.has(largest);
      const hasDataAttribute = largest.dataset.ceIconAttached === "true";
      
      if (!hasIconInMap && !hasDataAttribute) {
        console.log('🎯 Adding icon to input:', largest.tagName, largest.className);
        this.addIcon(largest);
        largest.dataset.ceIconAttached = "true";
      } else if (hasIconInMap && hasDataAttribute) {
        console.log('✅ Icon already attached to input');
      } else {
        // Clean up inconsistent state
        console.log('🔄 Cleaning up inconsistent icon state');
        if (hasIconInMap) {
          this.icons.get(largest).remove();
          this.icons.delete(largest);
        }
        if (hasDataAttribute) {
          delete largest.dataset.ceIconAttached;
        }
        // Try to add icon again
        console.log('🎯 Re-adding icon to input:', largest.tagName, largest.className);
        this.addIcon(largest);
        largest.dataset.ceIconAttached = "true";
      }
    } else {
      console.log('❌ No suitable input found');
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
      insertBtn.onclick = () => {
        this.insertText(enhancedText, inputElement);
        this.closePopup();
      // Notification removed
      // Stop icon spinning after insertion
      const icon = this.icons.get(inputElement);
      if (icon && icon._logo) icon._logo.classList.remove('ce-logo-spin');
    };
    
    // Show enhanced text instantly, no animation, no delay
    content.innerHTML = `<div id="animated-text" style="font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;">${enhancedText}</div>`;
  }

  async enhancePrompt(text) {
    try {
      // First try the quick test endpoint (no auth required) with retry mechanism
      console.log('🚀 Trying quick test endpoint...');
      
      let quickResponse;
      let retryCount = 0;
      const maxRetries = 1;
      let retryDelay = 1000; // Initial delay in milliseconds
      
      while (retryCount <= maxRetries) {
        try {
          quickResponse = await fetch('http://localhost:8004/api/v1/quick-test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: text,
              target_model: 'gpt-4o-mini'
            })
          });
          
          if (quickResponse.ok) {
            const result = await quickResponse.json();
            if (result.success) {
              console.log(`✅ Enhanced with backend (${result.model_used}):`, result.enhanced.substring(0, 100) + '...');
              return result.enhanced;
            }
          }
          
          // If we get here, response was not ok
          if (quickResponse.status === 429 || quickResponse.status === 500) {
            if (retryCount < maxRetries) {
              console.log(`⚠️ Backend error ${quickResponse.status}, retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
              continue;
            }
          }
          
          break; // Exit retry loop
          
        } catch (error) {
          if (retryCount < maxRetries) {
            console.log(`⚠️ Network error, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            retryCount++;
            continue;
          }
          throw error;
        }
      }
      
      // If quick test fails, try the authenticated endpoint
      console.log('🔄 Quick test failed, trying authenticated endpoint...');
      
      const token = await new Promise((resolve) => {
        chrome.storage.local.get(['google_token'], (result) => {
          resolve(result.google_token || null);
        });
      });

      if (!token) {
        console.log('⚠️ No auth token, using fallback enhancement');
        return this.getFallbackEnhancement(text);
      }

      // Send prompt to backend - let backend auto-detect model and set system prompts with retry
      let response;
      let authRetryCount = 0;
      const maxAuthRetries = 1;
      
      while (authRetryCount <= maxAuthRetries) {
        try {
          response = await fetch('http://localhost:8004/api/v1/enhance?fast_mode=true', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              prompt: text,
              url: window.location.href,
              context: null
            })
          });
          
          if (response.ok) {
            break; // Success, exit retry loop
          }
          
          const errorData = await response.json().catch(() => ({}));
          console.warn(`⚠️ Backend API failed (${response.status}):`, errorData);
          
          // Handle authentication errors specifically
          if (response.status === 401) {
            console.log('⚠️ Authentication failed, using fallback enhancement');
            return this.getFallbackEnhancement(text);
          } else if (response.status === 403) {
            console.log('⚠️ Access denied, using fallback enhancement');
            return this.getFallbackEnhancement(text);
          } else if (response.status === 429 || response.status === 500) {
            if (authRetryCount < maxAuthRetries) {
              console.log(`⚠️ Backend error ${response.status}, retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              authRetryCount++;
              continue;
            }
          }
          
          // If we get here, it's a non-retryable error or max retries reached
          console.log(`⚠️ API call failed (${response.status}), using fallback enhancement`);
          return this.getFallbackEnhancement(text);
          
        } catch (error) {
          if (authRetryCount < maxAuthRetries) {
            console.log(`⚠️ Network error, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            authRetryCount++;
            continue;
          }
          throw error;
        }
      }

      const result = await response.json();
      console.log(`✅ Enhanced with authenticated backend:`, result.enhanced.substring(0, 100) + '...');
      
      // Increment enhanced count in storage
      this.incrementEnhancedCount();
      
      return result.enhanced;
    } catch (error) {
      console.error('❌ Backend API failed:', error.message);
      
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
      // Get user info and extension state from storage
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['user_info', 'extension_active'], resolve);
      });
      
      this.userInfo = result.user_info;
      if (this.userInfo) {
        console.log('✅ User is logged in:', this.userInfo.name);
        
        // Check if extension should be active
        if (result.extension_active) {
          console.log('🔄 Extension was active, restarting...');
          this.startExtension();
        }
      } else {
        console.log('❌ No user logged in');
      }
    } catch (error) {
      console.error('❌ Error checking login status:', error);
    }
  }

  startExtension() {
    if (!this.userInfo) {
      console.log('❌ Cannot start extension - user not logged in');
      return false;
    }
    
    console.log('🚀 Starting extension for user:', this.userInfo.name);
    
    // Always reset state completely
    this.isExtensionActive = false;
    
    // Clear any old scanning interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
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
    
    // Now set as active
    this.isExtensionActive = true;
    
    // Store active state
    chrome.storage.local.set({ 'extension_active': true }, () => {
      console.log('💾 Extension active state saved');
    });
    
    // Initial scan for existing inputs
    console.log('🔍 Scanning for inputs...');
    this.scanForInputs(this.allSelectors);
    
    // Force another scan after a short delay
    setTimeout(() => {
      console.log('🔍 Force scanning for inputs...');
      this.scanForInputs(this.allSelectors);
    }, 100);
    
    // Start periodic scanning for inputs
    this.scanInterval = setInterval(() => {
      this.scanForInputs(this.allSelectors);
    }, 500);
    
    console.log('✅ Extension started successfully');
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
    
    // Remove all existing icons and clear data attributes
    console.log('🗑️ Removing all icons...');
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
    
    console.log('✅ Extension stopped - all icons and data cleared');
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
    
    // Clean up everything
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

// Initialize but don't start automatically
window.enhancerInstance = new CleanEnhancer();
console.log('🚀 Content script loaded - waiting for user to start extension');
console.log('📍 Current URL:', window.location.href);
console.log('🔧 Extension ID:', chrome.runtime.id);