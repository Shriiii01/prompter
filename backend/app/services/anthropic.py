# anthropic.py
import httpx
from typing import Optional, Dict, Literal
from anthropic import AsyncAnthropic
import re

class AnthropicService:
    """Anthropic API integration with smart prompt enhancement."""

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("API key cannot be empty.")
        self.client = AsyncAnthropic(api_key=api_key)
        self.model_map = {
            "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
            "claude-3-opus": "claude-3-opus-20240229",
            "claude-3-sonnet": "claude-3-sonnet-20240229"
        }

    async def enhance(self, 
                     user_prompt: str, 
                     target_model: str = "claude-3-5-sonnet") -> str:
        """
        Intelligently enhances prompts based on Anthropic's official guidelines.
        
        Args:
            user_prompt: The user's original prompt
            target_model: Which Claude model the prompt is for
            
        Returns:
            Enhanced prompt or original if no enhancement needed
        """
        if not user_prompt:
            raise ValueError("User prompt cannot be empty.")
            
        # Check if enhancement is needed
        if self._is_simple_prompt(user_prompt):
            return user_prompt  # Return as-is for simple prompts
        
        # Get the enhancement prompt
        system_prompt = self._get_enhancement_prompt()
        
        # Use the most capable model for enhancement
        model = self.model_map.get(target_model, self.model_map["claude-3-5-sonnet"])
        
        try:
            response = await self.client.messages.create(
                model=model,
                messages=[{
                    "role": "user", 
                    "content": f"{system_prompt}\n\nUser's prompt to enhance:\n{user_prompt}"
                }],
                max_tokens=1500,
                temperature=0.3
            )
            
            enhanced = response.content[0].text.strip()
            
            # Check if enhancement was needed
            if enhanced == "NO_ENHANCEMENT_NEEDED":
                return user_prompt
                
            return self._clean_enhanced_text(enhanced)
            
        except Exception as e:
            raise Exception(f"Enhancement failed: {str(e)}")
    
    def _is_simple_prompt(self, prompt: str) -> bool:
        """Determine if a prompt is too simple to need enhancement."""
        # Only skip enhancement for very basic greetings
        simple_greetings = [
            "hello",
            "hi",
            "hey",
            "how are you",
            "what's up",
            "how's it going",
            "good morning",
            "good afternoon", 
            "good evening",
            "thanks",
            "thank you",
            "bye",
            "goodbye"
        ]
        
        prompt_lower = prompt.lower().strip()
        
        # Only return True for exact matches or very close matches to simple greetings
        for greeting in simple_greetings:
            if prompt_lower == greeting or prompt_lower == greeting + "!" or prompt_lower == greeting + ".":
                return True
                
        # Very short single word responses
        if len(prompt.split()) <= 2 and prompt_lower in ["yes", "no", "ok", "okay", "sure"]:
            return True
            
        # Everything else should be enhanced
        return False
    
    def _get_enhancement_prompt(self) -> str:
        """Get the enhancement prompt for Anthropic's guidelines."""
        
        return """You are an expert prompt engineer trained on Anthropic's official documentation.

CRITICAL RULES:
1. ONLY enhance prompts that need improvement
2. Simple questions should remain simple
3. Apply Anthropic's best practices intelligently

ANTHROPIC'S OFFICIAL GUIDELINES:

1. **XML Tags** (use only for complex multi-part prompts):
   - <instructions> for task steps
   - <context> for background
   - <examples> for demonstrations
   - DON'T use XML for simple questions

2. **Clarity and Directness**:
   - Remove unnecessary words
   - Front-load the main request
   - Be specific about requirements

3. **Think Step-by-Step** (only for reasoning tasks):
   - Math/logic problems: Add this
   - Simple queries: Don't add this
   - Analysis tasks: Add this

4. **Output Format** (only when helpful):
   - Specify format only if ambiguous
   - Don't over-specify obvious formats

5. **Role Assignment** (only for specialized tasks):
   - Technical tasks: Assign expert role
   - Simple questions: No role needed

DECISION LOGIC:
- Simple prompt → Return "NO_ENHANCEMENT_NEEDED"
- Vague prompt → Add specificity
- Complex task → Add structure
- Good prompt → Minimal changes only

Return ONLY the enhanced prompt or 'NO_ENHANCEMENT_NEEDED':"""
    
    def _clean_enhanced_text(self, text: str) -> str:
        """Clean the enhanced text from any artifacts."""
        # Remove code blocks if present
        text = re.sub(r'```[a-z]*\n?', '', text)
        text = re.sub(r'```\s*$', '', text)
        
        # Remove common prefixes
        prefixes_to_remove = [
            "Enhanced prompt:",
            "Enhanced version:",
            "Here's the enhanced prompt:",
            "Improved prompt:"
        ]
        
        for prefix in prefixes_to_remove:
            if text.lower().startswith(prefix.lower()):
                text = text[len(prefix):].strip()
        
        return text.strip()