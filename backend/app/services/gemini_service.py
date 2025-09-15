"""Gemini Service for prompt enhancement"""

import logging
import aiohttp
import json
from typing import Optional
from app.core.prompts import ModelSpecificPrompts

logger = logging.getLogger(__name__)

class GeminiService:
    """Gemini API service for prompt enhancement"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        logger.info("✅ Gemini service initialized")
    
    async def enhance_with_model_specific_prompt(self, prompt: str, target_model: str = "gemini-2.5-flash") -> str:
        """Enhance prompt using Gemini API"""
        try:
            logger.info(f"🚀 Gemini enhancing prompt with {target_model}")
            
            # Use sophisticated model-specific system prompt  
            system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)

            payload = {
                "contents": [{
                    "parts": [{
                        "text": f"{system_prompt}\n\nPlease enhance this prompt:\n\n{prompt}"
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1000,
                }
            }
            
            url = f"{self.base_url}/models/gemini-1.5-pro:generateContent?key={self.api_key}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        enhanced = result['candidates'][0]['content']['parts'][0]['text'].strip()
                        logger.info(f"✅ Gemini enhancement successful: {len(enhanced)} chars")
                        return enhanced
                    else:
                        error_text = await response.text()
                        raise Exception(f"Gemini API error {response.status}: {error_text}")
            
        except Exception as e:
            logger.error(f"❌ Gemini enhancement failed: {e}")
            raise e
    
    def is_available(self) -> bool:
        """Check if Gemini service is available"""
        return bool(self.api_key)
