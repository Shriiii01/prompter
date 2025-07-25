// Test script for Perplexity AI insertion
// Run this in the browser console on perplexity.ai

console.log('🧪 Testing Perplexity AI Insertion');

function testPerplexityInsertion() {
  console.log('=== PERPLEXITY INSERTION TEST ===');
  
  // Test 1: Check if we're on Perplexity
  const isPerplexity = window.location.hostname.includes('perplexity.ai');
  console.log('📍 Current site:', window.location.hostname);
  console.log('🎯 Is Perplexity:', isPerplexity);
  
  // Test 2: Find input elements
  const allInputs = [
    ...document.querySelectorAll('textarea'),
    ...document.querySelectorAll('input[type="text"]'),
    ...document.querySelectorAll('input[type="search"]'),
    ...document.querySelectorAll('div[contenteditable="true"]'),
    ...document.querySelectorAll('[data-testid*="search"]'),
    ...document.querySelectorAll('[data-testid*="input"]'),
    ...document.querySelectorAll('[placeholder*="Ask"]'),
    ...document.querySelectorAll('[placeholder*="Search"]')
  ];
  
  console.log(`🔍 Found ${allInputs.length} potential input elements`);
  
  const visibleInputs = allInputs.filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= 0;
  });
  
  console.log(`👁️ Found ${visibleInputs.length} visible input elements`);
  
  if (visibleInputs.length === 0) {
    console.log('❌ No visible inputs found');
    return;
  }
  
  // Test 3: Test insertion on the main input
  const mainInput = visibleInputs[0];
  console.log('🎯 Testing on:', mainInput.tagName, mainInput.className);
  console.log('📝 Element properties:', {
    tagName: mainInput.tagName,
    className: mainInput.className,
    contentEditable: mainInput.contentEditable,
    type: mainInput.type,
    placeholder: mainInput.placeholder
  });
  
  const testText = "**RESEARCH DIRECTIVE:** Test insertion for Perplexity AI\n\nThis is a test prompt to verify insertion functionality.";
  
  // Test 4: Try different insertion methods
  console.log('\n--- Testing Insertion Methods ---');
  
  // Method 1: Direct value assignment
  try {
    if (mainInput.tagName === 'TEXTAREA' || mainInput.tagName === 'INPUT') {
      mainInput.value = testText;
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Method 1 (value) - Success');
      console.log('Current value:', mainInput.value.substring(0, 50) + '...');
    } else {
      console.log('⚠️ Method 1 (value) - Not applicable');
    }
  } catch (e) {
    console.log('❌ Method 1 (value) - Failed:', e.message);
  }
  
  // Method 2: ContentEditable innerHTML
  try {
    if (mainInput.contentEditable === 'true') {
      mainInput.innerHTML = testText.replace(/\n/g, '<br>');
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Method 2 (innerHTML) - Success');
      console.log('Current innerHTML:', mainInput.innerHTML.substring(0, 50) + '...');
    } else {
      console.log('⚠️ Method 2 (innerHTML) - Not applicable');
    }
  } catch (e) {
    console.log('❌ Method 2 (innerHTML) - Failed:', e.message);
  }
  
  // Method 3: TextContent
  try {
    if (mainInput.contentEditable === 'true' || mainInput.tagName === 'DIV') {
      mainInput.textContent = testText;
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Method 3 (textContent) - Success');
      console.log('Current textContent:', mainInput.textContent.substring(0, 50) + '...');
    } else {
      console.log('⚠️ Method 3 (textContent) - Not applicable');
    }
  } catch (e) {
    console.log('❌ Method 3 (textContent) - Failed:', e.message);
  }
  
  // Method 4: Lexical Editor Structure (Perplexity-specific)
  try {
    if (isPerplexity && mainInput.contentEditable === 'true') {
      // Clear existing content
      mainInput.innerHTML = '';
      mainInput.textContent = '';
      
      // Create Lexical structure
      const paragraph = document.createElement('p');
      paragraph.setAttribute('dir', 'ltr');
      
      const span = document.createElement('span');
      span.setAttribute('data-lexical-text', 'true');
      span.textContent = testText; // Set entire text at once
      
      paragraph.appendChild(span);
      mainInput.appendChild(paragraph);
      
      mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      mainInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Method 4 (Lexical) - Success');
      console.log('Current structure:', mainInput.innerHTML.substring(0, 100) + '...');
    } else {
      console.log('⚠️ Method 4 (Lexical) - Not applicable');
    }
  } catch (e) {
    console.log('❌ Method 4 (Lexical) - Failed:', e.message);
  }
  
  console.log('\n=== TEST COMPLETE ===');
  console.log('If you see success messages above, insertion should work!');
  console.log('If you see failures, the extension needs to be updated.');
}

// Test 5: Check if our extension is loaded
function checkExtensionStatus() {
  console.log('\n=== EXTENSION STATUS CHECK ===');
  
  // Check if our extension's content script is loaded
  const hasEnhancer = typeof window.CleanEnhancer !== 'undefined';
  console.log('🔧 CleanEnhancer class available:', hasEnhancer);
  
  // Check if our icons are present
  const enhancerIcons = document.querySelectorAll('.ce-icon');
  console.log('🎯 Enhancer icons found:', enhancerIcons.length);
  
  // Check if our styles are injected
  const enhancerStyles = document.getElementById('clean-enhancer-styles');
  console.log('🎨 Enhancer styles injected:', !!enhancerStyles);
  
  if (hasEnhancer && enhancerIcons.length > 0) {
    console.log('✅ Extension appears to be loaded and active');
  } else {
    console.log('❌ Extension may not be loaded or active');
    console.log('💡 Try reloading the extension in chrome://extensions/');
  }
}

// Run tests
testPerplexityInsertion();
checkExtensionStatus();

// Make functions available globally
window.testPerplexityInsertion = testPerplexityInsertion;
window.checkExtensionStatus = checkExtensionStatus;

console.log('\n🧪 Test functions available:');
console.log('- testPerplexityInsertion() - Test insertion methods');
console.log('- checkExtensionStatus() - Check extension status'); 