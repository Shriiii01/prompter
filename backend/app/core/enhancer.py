import time
import re
from datetime import datetime
from typing import Optional, List
from app.models.response import EnhancementResult, PromptAnalysis
from app.core.analyzer import PromptAnalyzer
from app.services.openai import OpenAIService
from app.services.cache import CacheService
from app.models.request import LLMModel

class PromptEnhancer:
    """Fast and efficient prompt enhancer"""
    
    def __init__(self, openai_key: Optional[str] = None):
        
        # Initialize services
        self.openai_service = OpenAIService(openai_key) if openai_key else None
        self.analyzer = PromptAnalyzer()
        self.cache = CacheService()
        
        print("🚀 PromptEnhancer initialized with Fast Pipeline")
    
    async def enhance(self, prompt: str, target_model: LLMModel, 
                     context: Optional[str] = None) -> EnhancementResult:
        """Fast prompt enhancement with caching"""
        
        start_time = time.time()
        print(f"🎯 Fast enhancing: {prompt[:50]}...")

        # Handle edge cases first
        edge_case_result = self._handle_edge_cases(prompt, start_time)
        if edge_case_result:
            return edge_case_result
        
        # Check cache first
        cache_key = f"enhance_v3:{hash(prompt)}:{target_model.value}"
        cached_result = await self.cache.get(cache_key)
        
        if cached_result:
            print("✅ Cache hit - returning cached result")
            return EnhancementResult(**cached_result)
        
        try:
            # Direct enhancement without complex pipeline
            enhanced_prompt = await self._direct_enhance(prompt, target_model)
            
            # Clean up the prompt to remove any unwanted prefixes
            cleaned_prompt = self._cleanup_prompt(enhanced_prompt)

            # Quick analysis
            analysis = self.analyzer.analyze(prompt)
            
            # Create result
            result = EnhancementResult(
                original=prompt,
                enhanced=cleaned_prompt,
                model_used=f"fast-enhancer-{target_model.value}",
                improvements=self._identify_improvements(prompt, cleaned_prompt),
                analysis=analysis,
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
            
            # Cache the result
            await self.cache.set(cache_key, result.dict(), ttl=3600)
            
            print(f"✅ Enhancement completed in {result.enhancement_time:.2f}s")
            return result
            
        except Exception as e:
            print(f"❌ Enhancement failed: {e}")
            # Return basic fallback
            return EnhancementResult(
                original=prompt,
                enhanced=prompt,
                model_used="fallback",
                improvements=["Unable to enhance - using original"],
                analysis=self.analyzer.analyze(prompt),
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )

    def _handle_edge_cases(self, prompt: str, start_time: float) -> Optional[EnhancementResult]:
        """Handle non-standard inputs like emoji-only prompts"""
        # Check for emoji-only prompts
        if self._is_emoji_only(prompt):
            return EnhancementResult(
                original=prompt,
                enhanced=f"Tell me a story about these emojis: {prompt}",
                model_used="edge-case-handler",
                improvements=["Converted emoji-only prompt to a creative request"],
                analysis=self.analyzer.analyze(prompt),
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
        return None

    def _is_emoji_only(self, text: str) -> bool:
        """Check if a string contains only emojis and whitespace"""
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags (iOS)
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+", flags=re.UNICODE)
        # Remove all emojis and see if only whitespace is left
        return not emoji_pattern.sub(' ', text).strip()
    
    def _cleanup_prompt(self, text: str) -> str:
        """Remove any unwanted prefixes from the enhanced prompt"""
        lines = text.split('\n')
        if lines:
            # Check for common prefixes and remove the first line if it matches
            first_line = lines[0].lower()
            if first_line.startswith("prompt for") or first_line.startswith("enhanced prompt:"):
                return '\n'.join(lines[1:])
        return text

    async def _direct_enhance(self, prompt: str, target_model: LLMModel) -> str:
        """Direct enhancement using GPT-4o with model-specific system prompts"""
        
        # Always use GPT-4o for enhancement but with model-specific prompts
        if self.openai_service:
            try:
                return await self.openai_service.enhance_with_model_specific_prompt(prompt, target_model.value)
            except Exception as e:
                print(f"GPT-4o enhancement failed: {e}")
        
        # Fallback to basic improvement if GPT-4o is not available
        return self._basic_enhancement(prompt)
    
    def _basic_enhancement(self, prompt: str) -> str:
        """Basic enhancement when no AI service is available"""
        
        enhanced = prompt.strip()
        
        # Basic improvements
        if len(enhanced) < 10:
            enhanced = f"Please provide detailed information about: {enhanced}"
        
        if not enhanced.endswith(('.', '!', '?')):
            enhanced += '.'
        
        # Add specificity for common vague prompts
        if "tell me about" in enhanced.lower():
            enhanced = enhanced.replace("tell me about", "explain in detail")
        
        if "help me" in enhanced.lower() and "with" not in enhanced.lower():
            enhanced = enhanced.replace("help me", "provide specific guidance on")
        
        return enhanced
    
    def _identify_improvements(self, original: str, enhanced: str) -> List[str]:
        """Identify improvements made"""
        
        improvements = []
        
        if len(enhanced) > len(original):
            improvements.append("Added more specificity and detail")
        
        if "?" in enhanced and "?" not in original:
            improvements.append("Improved question structure")
        
        if enhanced.count(',') > original.count(','):
            improvements.append("Better organization and flow")
        
        if not improvements:
            improvements.append("Optimized for better AI responses")
        
        return improvements
    
    def get_pipeline_info(self) -> dict:
        """Get information about the enhancement pipeline"""
        return {
            "pipeline_version": "Fast v1.0",
            "features": ["direct_enhancement", "caching", "fallback"],
            "optimized_for": "speed and reliability"
        }
    
    async def test_enhancement(self, test_prompt: str = "Hey, I wanna know more about perplexity") -> dict:
        """Test the enhancement pipeline"""
        
        print(f"🧪 Testing enhancement: '{test_prompt}'")
        
        result = await self.enhance(test_prompt, LLMModel.GPT4, enhancement_level="medium")
        
        return {
            "original": result.original,
            "enhanced": result.enhanced,
            "improvements": result.improvements,
            "processing_time": result.enhancement_time,
            "success": True
        }
