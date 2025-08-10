import httpx
from typing import Optional
import re
import asyncio
import logging

logger = logging.getLogger(__name__)

class GeminiService:
    """Google Gemini API integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.model_map = {
            "gemini-1.5-flash": "gemini-1.5-flash",
            "gemini-1.5-pro": "gemini-1.5-pro",
            "gemini-1.0-pro": "gemini-1.0-pro"
        }
    
    def _get_model_specific_system_prompt(self, target_model: str) -> str:
        """Get model-specific system prompt from prompts.py"""
        
        # Import the ModelSpecificPrompts class
        from app.core.prompts import ModelSpecificPrompts
        
        # Use the model-specific prompts from prompts.py
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
        
        # Add explicit instruction to return only the enhanced prompt
        system_prompt += "\n\nCRITICAL: Return ONLY the enhanced prompt. Do NOT include any explanations, meta-commentary, or repeat the system prompt. Just return the transformed user prompt."
        
        return system_prompt

    async def enhance_with_model_specific_prompt(self, prompt: str, target_model: str) -> str:
        """Use Gemini to enhance prompts with model-specific system prompts"""
        
        # Don't enhance simple/casual prompts
        if self._is_simple_prompt(prompt):
            return prompt
            
        try:
            # Get the model-specific system prompt from prompts.py
            from app.core.prompts import ModelSpecificPrompts
            model_system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
            
            # Create the enhancement request using the model-specific prompt
            enhancement_request = f"""Transform this user prompt for maximum effectiveness with {target_model}:

USER PROMPT: "{prompt}"

CRITICAL: Return ONLY the enhanced version of the user's prompt. Do NOT include any explanations, meta-commentary, or repeat the system prompt. Just return the transformed user prompt."""

            # Use Gemini 1.5 Flash for speed and cost efficiency
            response = await self._call_gemini_api(
                model="gemini-1.5-flash",
                system_prompt=model_system_prompt,
                user_prompt=enhancement_request
            )
            
            enhanced_prompt = response.strip()
            
            # Clean up any meta-commentary
            enhanced_prompt = self.clean_enhanced_text(enhanced_prompt)
            
            return enhanced_prompt
            
        except Exception as e:
            logger.error(f"Gemini enhancement failed: {e}")
            return prompt  # Return original on failure

    async def enhance(self, prompt: str, target_model: str) -> str:
        """Call Gemini to enhance the prompt (fallback method)"""
        # Don't enhance simple/casual prompts
        if self._is_simple_prompt(prompt):
            return prompt
            
        try:
            enhancement_prompt = f"""You are an expert prompt engineer with deep expertise in AI model optimization. Your mission is to transform user prompts into exceptional, highly-effective prompts that produce outstanding results.

USER'S PROMPT:
"{prompt}"

TRANSFORMATION MISSION: Transform this prompt using proven prompt engineering techniques while maintaining natural, professional language.

ESSENTIAL IMPROVEMENTS:
1. **Clarity & Specificity**: Make the intent crystal clear and actionable
2. **Strategic Structure**: Add logical organization that guides the AI's thinking
3. **Context Enhancement**: Provide relevant background when helpful
4. **Output Specification**: Define clear expectations for the response format
5. **Quality Constraints**: Set appropriate boundaries and requirements

PROFESSIONAL TRANSFORMATION GUIDELINES:
- Maintain natural, professional tone
- Add structure that enhances clarity without being robotic
- Specify output format only when it adds value
- Include examples when they improve understanding
- Set appropriate depth and scope expectations
- Use role assignment when helpful ("You are a [specific expert]")
- Add structured thinking for complex tasks ("Let's approach this systematically")
- Request step-by-step reasoning for analytical tasks

OPTIMIZED PROMPT:"""
            
            # Use Gemini 1.5 Flash for speed and cost efficiency
            response = await self._call_gemini_api(
                model="gemini-1.5-flash",
                system_prompt="You are an expert at rewriting prompts to be more specific and effective. Return only the enhanced prompt, no explanations.",
                user_prompt=enhancement_prompt
            )
            
            return self.clean_enhanced_text(response.strip())
            
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")

    async def _call_gemini_api(self, model: str, system_prompt: str, user_prompt: str) -> str:
        """Make a call to the Gemini API"""
        try:
            url = f"{self.base_url}/models/{model}:generateContent"
            
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key
            }
            
            data = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": f"{system_prompt}\n\n{user_prompt}"
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 400,
                    "stopSequences": []
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=data)
                response.raise_for_status()
                
                result = response.json()
                
                if "candidates" in result and len(result["candidates"]) > 0:
                    content = result["candidates"][0]["content"]
                    if "parts" in content and len(content["parts"]) > 0:
                        return content["parts"][0]["text"]
                    else:
                        raise Exception("No content parts in response")
                else:
                    raise Exception("No candidates in response")
                    
        except httpx.TimeoutException:
            raise Exception("Gemini API timeout")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise Exception("Gemini API rate limit exceeded")
            elif e.response.status_code == 401:
                raise Exception("Gemini API authentication failed")
            else:
                raise Exception(f"Gemini API error: {e.response.status_code}")
        except Exception as e:
            raise Exception(f"Gemini API call failed: {str(e)}")

    def _is_simple_prompt(self, prompt: str) -> bool:
        """Check if prompt is too simple to enhance"""
        # Only skip enhancement for very basic greetings
        simple_greetings = [
            "hello", "hi", "hey", "how are you", "what's up", "how's it going",
            "good morning", "good afternoon", "good evening", "thanks", "thank you", "bye", "goodbye"
        ]
        
        prompt_lower = prompt.lower().strip()
        
        # Only return True for exact matches to simple greetings
        for greeting in simple_greetings:
            if prompt_lower == greeting or prompt_lower == greeting + "!" or prompt_lower == greeting + ".":
                return True
                
        # Very short single word responses
        if len(prompt.split()) <= 2 and prompt_lower in ["yes", "no", "ok", "okay", "sure"]:
            return True
            
        # Everything else should be enhanced
        return False

    def clean_enhanced_text(self, text):
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