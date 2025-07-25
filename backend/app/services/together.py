import httpx
from typing import Optional
import re
import asyncio
import json

class TogetherAIService:
    """Together AI API integration for Llama-4-Maverick-17B-128E-Instruct-FP8"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.together.xyz/v1"
        self.model = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_model_specific_system_prompt(self, target_model: str) -> str:
        """Get professional system prompt for prompt optimization"""
        
        # Professional system prompt for all models
        system_prompt = """You are an expert prompt engineer with deep expertise in AI model optimization. Your mission is to transform user prompts into exceptional, highly-effective prompts that produce outstanding results.

TRANSFORMATION APPROACH:
Transform this prompt using proven prompt engineering techniques while maintaining natural, professional language. Focus on:

1. **Clarity & Specificity**: Make the intent crystal clear and actionable
2. **Strategic Structure**: Add logical organization that guides the AI's thinking
3. **Context Enhancement**: Provide relevant background when helpful
4. **Output Specification**: Define clear expectations for the response format
5. **Quality Constraints**: Set appropriate boundaries and requirements

ESSENTIAL IMPROVEMENTS:
1. **Role Assignment**: When helpful, establish expertise context ("You are a [specific expert]")
2. **Structured Thinking**: For complex tasks, add "Let's approach this systematically"
3. **Output Format**: Specify response structure when beneficial
4. **Step-by-Step Reasoning**: For analytical tasks, request "Please walk through your reasoning"
5. **Concrete Examples**: Include relevant examples when they clarify the request
6. **Quality Standards**: Set clear expectations for depth and accuracy

PROFESSIONAL TRANSFORMATION EXAMPLES:

- "write code" → "You are an experienced software engineer. Please write a Python function that [specific task]. Include proper error handling, type hints, and a comprehensive docstring. Format your response with the code first, followed by a brief explanation of the approach and any important considerations."

- "help me understand" → "I'd like to understand [specific topic] thoroughly. Please provide a comprehensive explanation that includes: 1) Core concepts and definitions 2) Practical examples or applications 3) Common misconceptions or pitfalls to avoid. Format your response in clear sections with examples where helpful."

- "analyze this" → "Please conduct a thorough analysis of [specific subject]. Walk through your reasoning step-by-step, considering multiple perspectives and potential factors. Include relevant data or examples to support your conclusions. Format your response with clear sections for different aspects of the analysis."

OPTIMIZATION PRINCIPLES:
- Maintain natural, professional tone
- Add structure that enhances clarity without being robotic
- Specify output format only when it adds value
- Include examples when they improve understanding
- Set appropriate depth and scope expectations

Return ONLY the optimized prompt."""
        
        return system_prompt

    async def enhance_with_model_specific_prompt(self, prompt: str, target_model: str) -> str:
        """Use Llama-4-Maverick-17B-128E-Instruct-FP8 to enhance prompts with professional system prompts"""
        
        # Don't enhance simple/casual prompts
        if self._is_simple_prompt(prompt):
            return prompt
            
        try:
            # Get the professional system prompt
            system_prompt = self._get_model_specific_system_prompt(target_model)
            
            # Create the enhancement request message
            enhancement_request = f"""Transform this prompt into an exceptional, highly-effective prompt:

"{prompt}"

Apply proven prompt engineering techniques to make it significantly more effective while maintaining natural, professional language."""

            # Format for Together AI API
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": enhancement_request}
            ]
            
            response = await self._chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=400
            )
            
            enhanced_prompt = response.strip()
            
            # Clean up any meta-commentary
            enhanced_prompt = self.clean_enhanced_text(enhanced_prompt)
            
            return enhanced_prompt
            
        except Exception as e:
            print(f"Enhancement failed: {e}")
            return prompt  # Return original on failure

    async def enhance(self, prompt: str, target_model: str) -> str:
        """Call Together AI to enhance the prompt (fallback method)"""
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
            
            messages = [
                {"role": "system", "content": "You are an expert at rewriting prompts to be more specific and effective. Return only the enhanced prompt, no explanations."},
                {"role": "user", "content": enhancement_prompt}
            ]
            
            response = await self._chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=300
            )
            
            return self.clean_enhanced_text(response.strip())
            
        except Exception as e:
            raise Exception(f"Together AI API error: {str(e)}")

    async def _chat_completion(self, messages: list, temperature: float = 0.1, max_tokens: int = 300) -> str:
        """Generic chat completion method using Together AI API"""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": 0.9
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception(f"Together AI API error: {response.status_code} - {response.text}")
                
                data = response.json()
                return data["choices"][0]["message"]["content"]
                
        except Exception as e:
            raise Exception(f"Together AI API call failed: {str(e)}")

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
        # Remove any meta-commentary
        text = re.sub(r'^\s*Enhanced prompt:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*Here\'s the enhanced prompt:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^\s*Improved prompt:\s*', '', text, flags=re.IGNORECASE)
        text = text.strip(' "\'')
        return text 