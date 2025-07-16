"""
UNIFIED Model-Specific Prompt Enhancer
This system uses GPT-4o mini as the single LLM for all prompt enhancements,
but applies model-specific system prompts based on the target model.
"""

import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass

from app.models.response import EnhancementResult, PromptAnalysis
from app.models.request import LLMModel
from app.core.analyzer import PromptAnalyzer
from app.core.prompts import ModelSpecificPrompts
from app.services.openai import OpenAIService
from app.services.cache import CacheService

logger = logging.getLogger(__name__)

@dataclass
class UnifiedEnhancementSettings:
    """Settings for unified GPT-4o mini enhancement"""
    # Quality thresholds
    min_quality_for_enhancement: float = 30.0  # Lowered from 50.0 to 30.0 for Chrome extension compatibility
    max_quality_skip_enhancement: float = 85.0
    min_length_for_enhancement: int = 3  # Lowered from 10 to 3 words for Chrome extension compatibility
    
    # GPT-4o mini parameters for all models
    temperature: float = 0.7
    max_tokens: int = 1000
    
class ModelSpecificEnhancer:
    """
    Unified enhancer that uses GPT-4o mini for ALL models
    but applies model-specific system prompts
    """
    
    def __init__(self, 
                 openai_service: Optional[OpenAIService] = None,
                 cache_service: Optional[CacheService] = None):
        self.openai_service = openai_service
        self.cache = cache_service or CacheService()
        self.analyzer = PromptAnalyzer()
        self.settings = UnifiedEnhancementSettings()
        
        # Log initialization status
        if self.openai_service:
            logger.info("🚀 Initialized Unified Model-Specific Enhancer (GPT-4o mini for all models)")
        else:
            logger.warning("⚠️ Initialized Model-Specific Enhancer without OpenAI service - using fallback enhancement")
    
    async def enhance(self, prompt: str, target_model: LLMModel, 
                     context: Optional[str] = None) -> EnhancementResult:
        """
        Enhance prompt using GPT-4o mini with model-specific system prompts
        """
        start_time = time.time()
        model_name = target_model.value
        
        logger.info(f"🎯 Enhancing for TARGET MODEL: {model_name} using GPT-4o mini")
        logger.info(f"📝 Original prompt: '{prompt[:100]}...'")
        
        # Check cache first (busting cache for testing)
        cache_key = f"unified_v2:{hash(prompt)}:{model_name}"
        cached_result = await self.cache.get(cache_key)
        
        if cached_result:
            logger.info("✅ Cache hit - returning cached result")
            return EnhancementResult(**cached_result)
        
        try:
            # Step 1: Analyze if enhancement is needed
            should_enhance, reasoning = self._should_enhance_prompt(prompt)
            
            if not should_enhance:
                logger.info(f"⏭️ Skipping enhancement: {reasoning}")
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
            
            # Step 2: Enhance using GPT-4o mini with model-specific prompts (or fallback)
            if self.openai_service:
                enhanced_prompt = await self._enhance_with_gpt4o_mini(prompt, model_name)
                
                if not enhanced_prompt or enhanced_prompt == prompt:
                    logger.warning(f"⚠️ Enhancement failed or returned same prompt")
                    enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
            else:
                logger.info(f"🔄 Using fallback enhancement (no OpenAI service)")
                enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
            
            # Step 3: Create result
            analysis = self.analyzer.analyze(prompt)
            improvements = self._identify_improvements(prompt, enhanced_prompt)
            
            result = EnhancementResult(
                original=prompt,
                enhanced=enhanced_prompt,
                model_used=f"gpt-4o-mini-for-{model_name}",
                improvements=improvements,
                analysis=analysis,
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
            
            # Cache the result
            await self.cache.set(cache_key, result.dict(), ttl=3600)
            
            logger.info(f"✅ Enhancement completed in {result.enhancement_time:.2f}s")
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
        """Determine if prompt needs enhancement"""
        
        word_count = len(prompt.split())
        analysis = self.analyzer.analyze(prompt)
        
        logger.info(f"🔍 Enhancement check: '{prompt}' - {word_count} words, score {analysis.overall_score:.1f}")
        logger.info(f"📊 Thresholds: min_length={self.settings.min_length_for_enhancement}, max_quality={self.settings.max_quality_skip_enhancement}")
        
        # Skip very short prompts (less than 3 words)
        if word_count < self.settings.min_length_for_enhancement:
            logger.info(f"❌ Skipping: Too short ({word_count} < {self.settings.min_length_for_enhancement})")
            return False, f"Too short ({word_count} words)"
        
        # Skip high-quality prompts (above 85 score)
        if analysis.overall_score >= self.settings.max_quality_skip_enhancement:
            logger.info(f"❌ Skipping: Too high quality ({analysis.overall_score:.1f} >= {self.settings.max_quality_skip_enhancement})")
            return False, f"Already high quality ({analysis.overall_score:.1f}/100)"
        
        # Only skip very basic single-word greetings
        simple_phrases = ['hello', 'hi', 'thanks', 'yes', 'no', 'ok']
        if prompt.lower().strip() in simple_phrases:
            logger.info(f"❌ Skipping: Basic greeting")
            return False, "Basic greeting/response"
        
        # For Chrome extension compatibility, enhance most prompts that aren't perfect
        logger.info(f"✅ Enhancement approved: Quality score {analysis.overall_score:.1f}/100")
        return True, f"Quality score {analysis.overall_score:.1f}/100 - enhancement beneficial"
    
    async def _enhance_with_gpt4o_mini(self, prompt: str, target_model: str) -> str:
        """
        Use GPT-4o mini with model-specific system prompts for enhancement
        """
        
        # Get model-specific messages
        messages = ModelSpecificPrompts.create_enhancement_messages(prompt, target_model)
        
        logger.info(f"🚀 Using GPT-4o mini with {target_model}-specific system prompts")
        logger.info(f"📋 System prompt preview: {messages[0]['content'][:100]}...")
        
        try:
            # Always use GPT-4o mini regardless of target model
            response = await self.openai_service.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=self.settings.temperature,
                max_tokens=self.settings.max_tokens,
                top_p=0.9
            )
            
            enhanced_prompt = response.choices[0].message.content.strip()
            
            # Clean up any meta-commentary
            enhanced_prompt = self.openai_service.clean_enhanced_text(enhanced_prompt)
            
            logger.info(f"✅ GPT-4o mini enhancement successful for {target_model}")
            return enhanced_prompt
                
        except Exception as e:
            logger.error(f"GPT-4o mini enhancement failed: {str(e)}")
            raise e
    
    def _create_fallback_enhancement(self, prompt: str, model_name: str) -> str:
        """Create a basic enhancement as fallback"""
        
        logger.info(f"🔄 Creating fallback enhancement for {model_name}")
        
        # Model-specific fallback patterns
        if model_name.startswith("gpt"):
            return f"You are an expert assistant. Please help with the following request: {prompt}. Provide a comprehensive and well-structured response."
        elif model_name.startswith("claude"):
            return f"<task>Please help me with the following request</task>\n<request>{prompt}</request>\n<format>Please provide a thorough and well-organized response</format>\nThank you for your assistance!"
        elif model_name.startswith("gemini"):
            return f"Help me with the following request: {prompt}\n\n• Provide comprehensive information\n• Use clear organization\n• Include practical examples when helpful\n\nPlease explain your approach step-by-step."
        elif model_name.startswith("perplexity"):
            return f"Research and provide comprehensive information about: {prompt}\n\n• **Key findings**: Thorough analysis with current information\n• **Source requirements**: Credible, up-to-date sources with citations\n• **Verification**: Cross-reference multiple authoritative sources\n• **Multiple perspectives**: Include different viewpoints and approaches\n\nPlease prioritize factual accuracy and cite reliable sources."
        elif model_name.startswith("meta"):
            return f"Hello! I'm Meta AI, and I'm here to help you with: {prompt}\n\n🎯 **My approach will be:**\n• **Conversational & Natural**: I'll engage with you like a knowledgeable friend\n• **Helpful & Practical**: Focus on actionable insights and real-world applications\n• **Current & Informed**: Drawing from up-to-date information and diverse perspectives\n• **Clear & Organized**: Present information in an easy-to-understand format\n• **Thoughtful & Thorough**: Consider multiple angles while being concise\n\nI'm designed to be genuinely helpful while maintaining accuracy and providing valuable context. Let me assist you with this thoughtfully and comprehensively."
        else:
            return f"Please provide a detailed and helpful response to: {prompt}"
    
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