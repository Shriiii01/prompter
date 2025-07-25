import httpx
from typing import Optional
from openai import AsyncOpenAI
import re
import asyncio

class OpenAIService:
    """OpenAI API integration"""
    
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model_map = {
            "gpt-4": "gpt-4-turbo-preview",
            "gpt-4o-mini": "gpt-4o-mini",
            "gpt-3.5-turbo": "gpt-3.5-turbo-16k"
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
        """Use GPT-4o mini to enhance prompts with model-specific system prompts"""
        
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

            messages = [
                {"role": "system", "content": model_system_prompt},
                {"role": "user", "content": enhancement_request}
            ]
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3,
                max_tokens=400,
                top_p=0.95,
                frequency_penalty=0.1,
                presence_penalty=0.1,
                timeout=30
            )
            
            enhanced_prompt = response.choices[0].message.content.strip()
            
            # Clean up any meta-commentary
            enhanced_prompt = self.clean_enhanced_text(enhanced_prompt)
            
            return enhanced_prompt
            
        except Exception as e:
            print(f"Enhancement failed: {e}")
            return prompt  # Return original on failure

    async def enhance(self, prompt: str, target_model: str) -> str:
        """Call OpenAI to enhance the prompt (fallback method)"""
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
            
            # Use GPT-4o-mini for speed and cost efficiency
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at rewriting prompts to be more specific and effective. Return only the enhanced prompt, no explanations."},
                    {"role": "user", "content": enhancement_prompt}
                ],
                temperature=0.7,  # Reduced for faster, more consistent responses
                max_tokens=300,  # Reduced for faster response
                top_p=0.9,  # Slightly reduced for speed
                frequency_penalty=0.0,  # Removed for speed
                presence_penalty=0.0  # Removed for speed
            )
            
            return self.clean_enhanced_text(response.choices[0].message.content.strip())
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    async def chat_completion(self, messages: list, model: str = "gpt-4o", temperature: float = 0.1, max_tokens: int = 300) -> str:
        """Generic chat completion method for the intelligent enhancer"""
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"OpenAI API call failed: {str(e)}")

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