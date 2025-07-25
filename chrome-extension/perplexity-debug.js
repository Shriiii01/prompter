// Perplexity AI Input Debugging Script
// Run this in the browser console on perplexity.ai

console.log('🔍 Perplexity AI Input Debugging Script v2.0');

function debugPerplexityInputs() {
  console.log('=== PERPLEXITY INPUT ANALYSIS ===');
  
  const allInputs = [
    ...document.querySelectorAll('textarea'),
    ...document.querySelectorAll('input[type="text"]'),
    ...document.querySelectorAll('input[type="search"]'),
    ...document.querySelectorAll('div[contenteditable="true"]'),
    ...document.querySelectorAll('[data-testid*="search"]'),
    ...document.querySelectorAll('[data-testid*="input"]'),
    ...document.querySelectorAll('[placeholder*="Ask"]'),
    ...document.querySelectorAll('[placeholder*="Search"]'),
    ...document.querySelectorAll('[role="textbox"]'),
    ...document.querySelectorAll('[aria-label*="search"]'),
    ...document.querySelectorAll('[aria-label*="input"]')
  ];
  
  console.log(`Found ${allInputs.length} potential input elements`);
  
  const visibleInputs = [];
  
  allInputs.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= 0;
    const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
    
    console.log(`\n--- Input ${index + 1} ---`);
    console.log('Tag:', element.tagName);
    console.log('Type:', element.type);
    console.log('Class:', element.className);
    console.log('ID:', element.id);
    console.log('Placeholder:', element.placeholder);
    console.log('Data-testid:', element.getAttribute('data-testid'));
    console.log('Role:', element.getAttribute('role'));
    console.log('Aria-label:', element.getAttribute('aria-label'));
    console.log('ContentEditable:', element.contentEditable);
    console.log('ReadOnly:', element.readOnly);
    console.log('Disabled:', element.disabled);
    console.log('Visible:', isVisible);
    console.log('In Viewport:', isInViewport);
    console.log('Size:', `${rect.width}x${rect.height}`);
    console.log('Position:', `(${rect.left}, ${rect.top})`);
    
    if (isVisible && isInViewport) {
      visibleInputs.push({
        element: element,
        index: index,
        tagName: element.tagName,
        className: element.className,
        placeholder: element.placeholder,
        contentEditable: element.contentEditable,
        rect: rect
      });
    }
  });
  
  console.log(`\n=== VISIBLE INPUTS (${visibleInputs.length}) ===`);
  visibleInputs.forEach((input, index) => {
    console.log(`${index + 1}. ${input.tagName} - ${input.className} - "${input.placeholder}" - contentEditable: ${input.contentEditable}`);
  });
  
  return visibleInputs;
}

function testPerplexityInsertion() {
  console.log('\n=== TESTING PERPLEXITY INSERTION ===');
  
  const testText = "**RESEARCH DIRECTIVE:** Test insertion for Perplexity AI\n\nThis is a test prompt to verify insertion functionality.";
  
  // Find the main input
  const inputs = debugPerplexityInputs();
  if (inputs.length === 0) {
    console.log('❌ No visible inputs found');
    return;
  }
  
  const mainInput = inputs[0].element;
  console.log('🎯 Testing insertion on:', mainInput.tagName, mainInput.className);
  
  // Test different insertion methods
  console.log('\n--- Method 1: Direct value assignment ---');
  try {
    if (mainInput.tagName === 'TEXTAREA' || mainInput.tagName === 'INPUT') {
      mainInput.value = testText;
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Value method successful');
      console.log('Current value:', mainInput.value);
    } else {
      console.log('⚠️ Not a textarea/input, skipping value method');
    }
  } catch (e) {
    console.log('❌ Value method failed:', e);
  }
  
  console.log('\n--- Method 2: ContentEditable innerHTML ---');
  try {
    if (mainInput.contentEditable === 'true') {
      mainInput.innerHTML = testText.replace(/\n/g, '<br>');
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ innerHTML method successful');
      console.log('Current innerHTML:', mainInput.innerHTML);
    } else {
      console.log('⚠️ Not contentEditable, skipping innerHTML method');
    }
  } catch (e) {
    console.log('❌ innerHTML method failed:', e);
  }
  
  console.log('\n--- Method 3: TextContent ---');
  try {
    if (mainInput.contentEditable === 'true' || mainInput.tagName === 'DIV') {
      mainInput.textContent = testText;
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ textContent method successful');
      console.log('Current textContent:', mainInput.textContent);
    } else {
      console.log('⚠️ Not suitable for textContent, skipping');
    }
  } catch (e) {
    console.log('❌ textContent method failed:', e);
  }
  
  console.log('\n--- Method 4: Lexical Editor Structure ---');
  try {
    if (window.location.hostname.includes('perplexity.ai') && mainInput.contentEditable === 'true') {
      // Clear existing content
      mainInput.innerHTML = '';
      
      // Create Lexical structure
      const paragraph = document.createElement('p');
      paragraph.setAttribute('dir', 'ltr');
      
      const span = document.createElement('span');
      span.setAttribute('data-lexical-text', 'true');
      span.textContent = testText;
      
      paragraph.appendChild(span);
      mainInput.appendChild(paragraph);
      
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Lexical structure method successful');
      console.log('Current structure:', mainInput.innerHTML);
    } else {
      console.log('⚠️ Not Perplexity or not contentEditable, skipping Lexical method');
    }
  } catch (e) {
    console.log('❌ Lexical structure method failed:', e);
  }
}

function testClipboardPaste() {
  console.log('\n=== TESTING CLIPBOARD PASTE ===');
  
  const testText = "**RESEARCH DIRECTIVE:** Test clipboard paste for Perplexity AI\n\nThis is a test prompt to verify clipboard functionality.";
  
  // Copy to clipboard
  navigator.clipboard.writeText(testText).then(() => {
    console.log('✅ Text copied to clipboard');
    
    // Find main input
    const inputs = debugPerplexityInputs();
    if (inputs.length === 0) {
      console.log('❌ No visible inputs found for paste test');
      return;
    }
    
    const mainInput = inputs[0].element;
    console.log('🎯 Testing paste on:', mainInput.tagName, mainInput.className);
    
    // Focus and paste
    mainInput.focus();
    
    setTimeout(() => {
      // Try Ctrl+V
      mainInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true
      }));
      
      mainInput.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true
      }));
      
      console.log('✅ Paste events dispatched');
      
      // Check result after a delay
      setTimeout(() => {
        const finalText = mainInput.contentEditable === 'true' ? 
          mainInput.textContent : mainInput.value;
        console.log('📝 Final text after paste:', finalText.substring(0, 100) + '...');
      }, 500);
      
    }, 200);
    
  }).catch(e => {
    console.log('❌ Clipboard write failed:', e);
  });
}

// Run the analysis
const mainInput = debugPerplexityInputs();

// Make functions available globally
window.debugPerplexityInputs = debugPerplexityInputs;
window.testPerplexityInsertion = testPerplexityInsertion;
window.testClipboardPaste = testClipboardPaste;

console.log('\n=== DEBUGGING COMMANDS AVAILABLE ===');
console.log('debugPerplexityInputs() - Run full analysis');
console.log('testPerplexityInsertion() - Test different insertion methods');
console.log('testClipboardPaste() - Test clipboard paste functionality'); 