"""
UNIFIED Model-Specific Prompt Enhancer
This system uses Llama-4-Maverick-17B-128E-Instruct-FP8 as the single LLM for all prompt enhancements,
but applies model-specific system prompts based on the target model.
"""

import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass
import asyncio

from app.models.response import EnhancementResult, PromptAnalysis
from app.models.request import LLMModel
from app.core.analyzer import PromptAnalyzer
from app.core.prompts import ModelSpecificPrompts
from app.services.openai import OpenAIService
from app.services.cache import CacheService

logger = logging.getLogger(__name__)

@dataclass
class UnifiedEnhancementSettings:
    """Settings for unified Llama-4-Maverick-17B-128E-Instruct-FP8 enhancement"""
    # Quality thresholds
    min_quality_for_enhancement: float = 30.0  # Lowered from 50.0 to 30.0 for Chrome extension compatibility
    max_quality_skip_enhancement: float = 85.0
    min_length_for_enhancement: int = 1  # Lowered from 3 to 1 word to enhance single words
    
    # Llama-4-Maverick-17B-128E-Instruct-FP8 parameters for all models - OPTIMIZED FOR QUALITY
    temperature: float = 0.7
    max_tokens: int = 1500  # Increased for comprehensive, high-quality enhancements
    timeout_seconds: float = 10.0  # Optimized timeout for reliability
    
class ModelSpecificEnhancer:
    """
    Unified enhancer that uses Llama-4-Maverick-17B-128E-Instruct-FP8 for ALL models
    but applies model-specific system prompts
    """
    
    def __init__(self, 
                 openai_service: Optional[OpenAIService] = None,
                 cache_service: Optional[CacheService] = None):
        self.openai_service = openai_service
        self.cache = cache_service or CacheService()
        self.analyzer = PromptAnalyzer()
        self.settings = UnifiedEnhancementSettings()
        
        # Simple in-memory cache for speed
        self._memory_cache = {}
        
        # Log initialization status
        if self.openai_service:
            logger.info("🚀 Initialized Model-Specific Enhancer (OpenAI GPT-4o-mini for all models)")
        else:
            logger.warning("⚠️ Initialized Model-Specific Enhancer without OpenAI service - using basic fallback enhancement")
    
    async def enhance(self, prompt: str, target_model: LLMModel, 
                     context: Optional[str] = None) -> EnhancementResult:
        """
        Enhance prompt using Llama-4-Maverick-17B-128E-Instruct-FP8 with model-specific system prompts
        """
        start_time = time.time()
        model_name = target_model.value
        
        # Minimal logging for speed
        # logger.info(f"🎯 Enhancing for {model_name}")
        
        # Check memory cache first for speed (FASTEST)
        cache_key = f"unified_v3:{hash(prompt)}:{model_name}"
        
        # Check in-memory cache first (fastest) - OPTIMIZED FOR SPEED
        if cache_key in self._memory_cache:
            cached_data = self._memory_cache[cache_key]
            if time.time() - cached_data['timestamp'] < 7200:  # 2 hours
                # logger.info("✅ Memory cache hit - instant response")
                return EnhancementResult(**cached_data['data'])
        
        # Skip Redis cache check for speed (only use memory cache)
        # cached_result = await self.cache.get(cache_key)
        # if cached_result:
        #     logger.info("✅ Redis cache hit - returning cached result")
        #     # Also store in memory cache for next time
        #     self._memory_cache[cache_key] = {
        #         'data': cached_result,
        #         'timestamp': time.time()
        #     }
        #     return EnhancementResult(**cached_result)
        
        try:
            # Step 1: Analyze if enhancement is needed
            should_enhance, reasoning = self._should_enhance_prompt(prompt)
            
            if not should_enhance:
                # logger.info(f"⏭️ Skipping enhancement: {reasoning}")
                analysis = self.analyzer.analyze(prompt)
                return EnhancementResult(
                    original=prompt,
                    enhanced=prompt,
                    model_used=f"skip-{model_name}",
                    improvements=["No enhancement needed - prompt is already effective"],
                    analysis=analysis,
                    enhancement_time=time.time() - start_time,
                    cached=False,
                    timestamp=datetime.now()
                )
            
            # Step 2: Use OpenAI GPT-4o-mini for all enhancements with model-specific prompts
            if self.openai_service:
                try:
                    enhanced_prompt = await self._enhance_with_openai(prompt, model_name)
                    model_used = f"gpt-4o-mini-for-{model_name}"
                    logger.info("✅ Successfully used OpenAI GPT-4o-mini enhancement")
                except Exception as openai_error:
                    logger.error(f"OpenAI GPT-4o-mini failed: {str(openai_error)}")
                    enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
                    model_used = f"basic-fallback-for-{model_name}"
            else:
                # No OpenAI service available
                enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
                model_used = f"basic-fallback-for-{model_name}"
            
            if not enhanced_prompt or enhanced_prompt == prompt:
                logger.warning(f"⚠️ Enhancement failed or returned same prompt")
                enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
            
            # Step 3: Create result
            analysis = self.analyzer.analyze(prompt)
            improvements = self._identify_improvements(prompt, enhanced_prompt)
            
            result = EnhancementResult(
                original=prompt,
                enhanced=enhanced_prompt,
                model_used=model_used,
                improvements=improvements,
                analysis=analysis,
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
            
            # Cache the result - OPTIMIZED FOR SPEED
            result_dict = result.dict()
            
            # Store in memory cache (fastest)
            self._memory_cache[cache_key] = {
                'data': result_dict,
                'timestamp': time.time()
            }
            
            # Skip Redis cache storage for speed
            # await self.cache.set(cache_key, result_dict, ttl=7200)  # 2 hours
            
            # logger.info(f"✅ Enhancement completed in {result.enhancement_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Enhancement failed: {str(e)}")
            # Return fallback result
            analysis = self.analyzer.analyze(prompt)
            return EnhancementResult(
                original=prompt,
                enhanced=self._create_fallback_enhancement(prompt, model_name),
                model_used=f"fallback-{model_name}",
                improvements=["Enhancement failed - using fallback"],
                analysis=analysis,
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
    
    def _should_enhance_prompt(self, prompt: str) -> tuple[bool, str]:
        """Determine if prompt needs enhancement - OPTIMIZED FOR SPEED"""
        
        word_count = len(prompt.split())
        
        # FAST CHECK: Skip very short prompts (less than 1 word)
        if word_count < self.settings.min_length_for_enhancement:
            return False, f"Too short ({word_count} words)"
        
        # FAST CHECK: Only skip very basic single-word greetings
        simple_phrases = ['hello', 'hi', 'thanks', 'yes', 'no', 'ok']
        if prompt.lower().strip() in simple_phrases:
            return False, "Basic greeting/response"
        
        # SKIP EXPENSIVE ANALYSIS: For speed, enhance most prompts
        # Only do analysis for very long prompts (>50 words) to save time
        if word_count > 50:
            analysis = self.analyzer.analyze(prompt)
            if analysis.overall_score >= self.settings.max_quality_skip_enhancement:
                return False, f"Already high quality ({analysis.overall_score:.1f}/100)"
        
        # For Chrome extension compatibility, enhance most prompts for speed
        return True, f"Enhancement beneficial ({word_count} words)"
    

    
    async def _enhance_with_openai(self, prompt: str, target_model: str) -> str:
        """
        Use OpenAI GPT-4o-mini with model-specific system prompts for enhancement (fallback)
        """
        
        logger.info(f"🚀 Using {target_model}-specific prompts with OpenAI GPT-4o-mini")
        
        try:
            # Use GPT-4o-mini for enhancement with model-specific prompts
            response = await asyncio.wait_for(
                self.openai_service.enhance_with_model_specific_prompt(prompt, target_model),
                timeout=self.settings.timeout_seconds  # Quality timeout for comprehensive responses
            )
            
            enhanced_prompt = response.strip()
            
            # Clean up any meta-commentary
            enhanced_prompt = self.openai_service.clean_enhanced_text(enhanced_prompt)
            
            logger.info(f"✅ OpenAI GPT-4o-mini enhancement successful for {target_model}")
            return enhanced_prompt
                
        except Exception as e:
            logger.error(f"OpenAI GPT-4o-mini enhancement failed: {str(e)}")
            raise e
    
    def _create_fallback_enhancement(self, prompt: str, model_name: str) -> str:
        """Create a high-quality enhancement using the same system prompts as AI services"""
        
        # Skip logging for speed
        # logger.info(f"🔄 Creating fallback enhancement for {model_name}")
        
        # Use the SAME high-quality system prompts from prompts.py
        # This ensures consistency between AI services and fallback
        try:
            # Get the model-specific system prompt from prompts.py
            system_prompt = ModelSpecificPrompts.get_system_prompt(model_name)
            
            # Create the enhancement using the same format as AI services
            # This ensures fallback quality matches AI service quality
            enhanced_prompt = f"""{system_prompt}

USER'S PROMPT:
"{prompt}"

TRANSFORMATION MISSION: Transform this prompt using the proven prompt engineering techniques outlined above while maintaining natural, professional language.

ESSENTIAL IMPROVEMENTS:
1. **Clarity & Specificity**: Make the intent crystal clear and actionable with precise language
2. **Strategic Structure**: Add logical organization that guides the AI's thinking process
3. **Context Enhancement**: Provide relevant background and context when helpful
4. **Output Specification**: Define clear expectations for response format, depth, and scope
5. **Quality Constraints**: Set appropriate boundaries, requirements, and quality standards
6. **Expertise Context**: Establish appropriate professional context when beneficial

PROFESSIONAL TRANSFORMATION GUIDELINES:
- Maintain natural, professional tone that feels human and approachable
- Add structure that enhances clarity without being robotic or overly formal
- Specify output format only when it adds significant value to the response
- Include examples, scenarios, or use cases when they improve understanding
- Set appropriate depth and scope expectations based on the complexity of the request
- Use role assignment when helpful ("You are a [specific expert] with [relevant experience]")
- Add structured thinking for complex tasks with systematic approaches
- Request step-by-step reasoning for analytical tasks
- Ensure the enhanced prompt leads to comprehensive, actionable, and valuable responses

OPTIMIZED PROMPT:"""
            
            return enhanced_prompt
            
        except Exception as e:
            # If there's any issue with the system prompts, fall back to a good template
            logger.warning(f"Failed to use system prompt for {model_name}, using template: {e}")
            
            # High-quality template as backup
            return f"""You are an expert assistant with deep knowledge and practical experience. 

TASK: {prompt}

APPROACH:
• Provide comprehensive, well-structured analysis
• Include practical examples and actionable insights
• Consider multiple perspectives and approaches
• Offer step-by-step guidance when applicable
• Ensure clarity and thoroughness in explanations

DELIVERABLES:
• Detailed response with clear organization
• Practical applications and real-world examples
• Actionable recommendations and next steps
• Additional resources or considerations when relevant

Please deliver a response that demonstrates expertise, thoroughness, and practical value."""
    
    def _identify_improvements(self, original: str, enhanced: str) -> list[str]:
        """Identify what improvements were made"""
        improvements = []
        
        if len(enhanced) > len(original) * 1.5:
            improvements.append("Added detail and specificity")
        
        if "you are" in enhanced.lower() and "you are" not in original.lower():
            improvements.append("Added expert role assignment")
        
        if any(marker in enhanced.lower() for marker in ["step", "format", "structure", "organize"]):
            improvements.append("Added structure and organization")
        
        if enhanced.count("?") > original.count("?"):
            improvements.append("Improved question formation")
        
        if not improvements:
            improvements.append("General clarity and effectiveness improvements")
        
        return improvements 