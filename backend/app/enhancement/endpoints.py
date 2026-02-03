from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from app.enhancement.prompts import ModelSpecificPrompts
from app.shared.config import config
import json
import openai

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = openai.AsyncOpenAI

router = APIRouter(tags=["enhancement"])

class EnhanceRequest(BaseModel):
    """Request model for prompt enhancement"""
    prompt: str = Field(..., description="The prompt to enhance", min_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "help me write code"
            }
        }

@router.post("/stream-enhance")
async def stream_enhance_prompt(request: EnhanceRequest, x_user_id: str = Header(None, alias="X-User-ID")):
    """Stream enhanced prompt in chunks for magical animation"""
    # Always use gpt-5-mini
    target_model = "gpt-5-mini"
    
    async def generate_stream():
        """Generate word-by-word streaming response from OpenAI API"""
        try:
            # Get system prompt for target model
            system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
            
            # Initialize OpenAI client
            client = AsyncOpenAI(api_key=config.settings.openai_api_key)
            
            # Call OpenAI API with streaming
            # Using GPT-5-mini with token limit for cost control
            stream = await client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Please enhance this prompt:\n\n{request.prompt}"}
                ],
                max_tokens=1500,  # Limit output length for cost control
                temperature=0.7,  # Balanced creativity
                stream=True,
                timeout=30
            )
            
            accumulated_text = ""
            
            # Stream chunks word-by-word
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        content = delta.content
                        accumulated_text += content
                        yield f"data: {json.dumps({'type': 'chunk', 'data': content})}\n\n"
            
            # Send completion message
            yield f"data: {json.dumps({'type': 'complete', 'data': accumulated_text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': f'Enhancement failed: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Expose-Headers": "*"
        }
    )