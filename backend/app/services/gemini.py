import httpx
import google.generativeai as genai
from typing import Optional
import asyncio

class GeminiService:
    """Google Gemini API integration"""
    
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def enhance(self, prompt: str, target_model: str) -> str:
        """Call Gemini to enhance the prompt"""
        try:
            # Gemini doesn't have native async, so we use run_in_executor
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self.model.generate_content,
                prompt,
                genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2000,
                )
            )
            
            return response.text.strip()
            
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")