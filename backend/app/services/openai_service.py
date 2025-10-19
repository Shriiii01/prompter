"""OpenAI Service for prompt enhancement"""

import logging
import openai
import asyncio
from typing import Optional
from app.core.prompts import ModelSpecificPrompts

# Handle OpenAI version compatibility
try:
    from openai import AsyncOpenAI
except ImportError:
    # Fallback for older versions
    AsyncOpenAI = openai.AsyncOpenAI

logger = logging.getLogger(__name__)

class OpenAIService:
    """OpenAI API service for prompt enhancement"""
    
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.api_key = api_key
        logger.info(" OpenAI service initialized")
    
    async def enhance_with_model_specific_prompt(self, prompt: str, target_model: str = "gpt-4o") -> str:
        """Enhance prompt using OpenAI API"""
        try:
            logger.info(f" OpenAI enhancing prompt with {target_model}")
            
            # Use sophisticated model-specific system prompt
            system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)

            # Use max_completion_tokens for newer models like gpt-4o
            if "gpt-4o" in target_model:
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",  # Use GPT-4o-mini for enhancement
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Please enhance this prompt:\n\n{prompt}"}
                    ],
                    max_completion_tokens=1000,
                    timeout=30
                )
            else:
                response = await self.client.chat.completions.create(
                    model=target_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Please enhance this prompt:\n\n{prompt}"}
                    ],
                    max_tokens=1000,
                    temperature=0.7,
                    timeout=30
                )
            
            enhanced = response.choices[0].message.content.strip()
            logger.info(f" OpenAI enhancement successful: {len(enhanced)} chars")
            return enhanced
            
        except Exception as e:
            logger.error(f" OpenAI enhancement failed: {e}")
            raise e
    
    def is_available(self) -> bool:
        """Check if OpenAI service is available"""
        return bool(self.api_key)

