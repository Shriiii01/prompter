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
        """Enhance prompt using OpenAI API with GPT-5 Mini fallback"""
        try:
            logger.info(f" OpenAI enhancing prompt with {target_model}")
            
            # Use sophisticated model-specific system prompt
            system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)

            # Try GPT-5 Mini first, then fallback to GPT-4o Mini
            models_to_try = ["gpt-5-mini", "gpt-4o-mini"]
            last_error = None
            
            for model in models_to_try:
                try:
                    logger.info(f" Trying OpenAI model: {model}")
                    
                    # Use max_completion_tokens for newer models
                    if "gpt-4o" in model or "gpt-5" in model:
                        response = await self.client.chat.completions.create(
                            model=model,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": f"Please enhance this prompt:\n\n{prompt}"}
                            ],
                            max_completion_tokens=1000,
                            timeout=30
                        )
                    else:
                        response = await self.client.chat.completions.create(
                            model=model,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": f"Please enhance this prompt:\n\n{prompt}"}
                            ],
                            max_tokens=1000,
                            temperature=0.7,
                            timeout=30
                        )
                    
                    enhanced = response.choices[0].message.content.strip()
                    logger.info(f" ✅ OpenAI enhancement successful with {model}")
                    return enhanced
                    
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f" ❌ OpenAI {model} failed: {e}")
                    
                    # If it's a 400/403 error and we have another model to try, continue
                    if "400" in str(e) or "403" in str(e) or "model" in str(e).lower():
                        if model != models_to_try[-1]:
                            logger.info(f" 🔄 Falling back from {model} to {models_to_try[models_to_try.index(model) + 1]}")
                            continue
                    
                    # If it's the last model, raise the error
                    if model == models_to_try[-1]:
                        raise Exception(f"All OpenAI models failed. Last error: {last_error}")
            
            # This should never be reached
            raise Exception(f"All OpenAI models failed. Last error: {last_error}")
            
        except Exception as e:
            logger.error(f" OpenAI enhancement failed: {e}")
            raise
    
    def is_available(self) -> bool:
        """Check if OpenAI service is available"""
        return bool(self.api_key)

