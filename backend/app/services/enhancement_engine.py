import asyncio
import logging
import time
import re
import httpx
from typing import Optional

from app.core.prompts import ModelSpecificPrompts

logger = logging.getLogger(__name__)

class EnhancementEngine:
    """
    Handles prompt enhancement logic for different providers
    """
    
    def __init__(self, together_api_key: Optional[str] = None):
        self.together_api_key = together_api_key
    
    async def enhance_with_provider(self, provider_type: str, provider_instance, prompt: str, target_model: str) -> str:
        """Enhance prompt with a specific provider"""
        timeout = 10.0  # 10 second timeout per provider
        
        if provider_type == "openai":
            return await asyncio.wait_for(
                provider_instance.enhance_with_model_specific_prompt(prompt, target_model),
                timeout=timeout
            )
        elif provider_type == "gemini":
            return await asyncio.wait_for(
                provider_instance.enhance_with_model_specific_prompt(prompt, target_model),
                timeout=timeout
            )
        elif provider_type == "together":
            return await asyncio.wait_for(
                self._enhance_with_together_api(prompt, target_model),
                timeout=timeout
            )
        else:
            raise Exception(f"Unknown provider type: {provider_type}")
    
    async def _enhance_with_together_api(self, prompt: str, target_model: str) -> str:
        """Enhance prompt using Together API"""
        if not self.together_api_key:
            raise Exception("Together API key not configured")
        
        # Get model-specific system prompt
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
        
        # Create enhancement request
        enhancement_request = f"""Transform this user prompt for maximum effectiveness with {target_model}:

USER PROMPT: "{prompt}"

CRITICAL: Return ONLY the enhanced version of the user's prompt. Do NOT include any explanations, meta-commentary, or repeat the system prompt. Just return the transformed user prompt."""
        
        url = "https://api.together.xyz/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.together_api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "meta-llama/Llama-3.1-8B-Instruct",  # Fast and reliable model
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": enhancement_request}
            ],
            "temperature": 0.3,
            "max_tokens": 400,
            "top_p": 0.95,
            "frequency_penalty": 0.1,
            "presence_penalty": 0.1
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            enhanced_prompt = result["choices"][0]["message"]["content"].strip()
            
            # Clean up any meta-commentary
            return self._clean_enhanced_text(enhanced_prompt)
    
    def _clean_enhanced_text(self, text: str) -> str:
        """Clean enhanced text by removing common prefixes and meta-commentary"""
        # Remove common prefixes
        text = re.sub(r'^\s*Enhanced prompt:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*Here\'s the enhanced prompt:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*Improved prompt:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*User prompt:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*Original prompt:\s*', '', text, flags=re.IGNORECASE)
        
        # Remove any quotes at the beginning and end
        text = text.strip(' "\'')
        
        # If the response is too short or looks like an error, return a basic enhancement
        if len(text) < 10 or "I cannot" in text or "I can't" in text:
            return f"Please provide a detailed response to: {text}"
        
        return text
    
    def create_fallback_enhancement(self, prompt: str, target_model: str) -> str:
        """Create a basic enhanced prompt when all providers fail"""
        logger.info("🔄 Creating fallback enhancement")
        
        # Simple but effective enhancement
        enhanced_parts = []
        
        # Add expert role
        if len(prompt.split()) < 10:
            enhanced_parts.append(f"You are an expert in this field. Please provide a comprehensive explanation of: {prompt}")
        else:
            enhanced_parts.append(f"You are an expert. Please provide a detailed analysis of: {prompt}")
        
        # Add structure for complex requests
        if any(word in prompt.lower() for word in ['explain', 'how', 'what', 'why', 'analyze', 'compare']):
            enhanced_parts.append("Please structure your response with clear sections and provide practical examples.")
        
        # Add depth for technical topics
        if any(word in prompt.lower() for word in ['quantum', 'algorithm', 'code', 'programming', 'technology', 'science']):
            enhanced_parts.append("Please include relevant technical details, examples, and practical applications.")
        
        # Combine enhancements
        enhanced_prompt = " ".join(enhanced_parts)
        
        # Ensure it's different from original
        if enhanced_prompt == prompt:
            enhanced_prompt = f"You are an expert. Please provide a comprehensive and detailed response to: {prompt}"
        
        return enhanced_prompt 