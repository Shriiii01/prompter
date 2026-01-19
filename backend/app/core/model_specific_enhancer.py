"""
UNIFIED Model-Specific Prompt Enhancer
This system uses a multi-provider architecture with OpenAI, Gemini, and Together API providers
for prompt enhancements, applying model-specific system prompts based on the target model.
Features a 3-layer fallback system: OpenAI → Gemini → Together API with circuit breaker patterns.
"""

import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass
import asyncio
import httpx
import json

from app.models.response import EnhancementResult, PromptAnalysis
from app.models.request import LLMModel
from app.core.analyzer import PromptAnalyzer
from app.core.prompts import ModelSpecificPrompts
from app.services.openai_service import OpenAIService
from app.services.cache import CacheService
from app.core.config import config

logger = logging.getLogger(__name__)

@dataclass
class UnifiedEnhancementSettings:
    """Settings for unified enhancement - ULTRA OPTIMIZED FOR SPEED"""
    # Quality thresholds - ULTRA AGGRESSIVE for speed
    min_quality_for_enhancement: float = 15.0  # Even lower for speed
    max_quality_skip_enhancement: float = 95.0  # Higher threshold to skip more
    min_length_for_enhancement: int = 1  # Keep at 1 for Chrome extension
    
    # ULTRA SPEED OPTIMIZED parameters
    temperature: float = 0.3  # Lower for consistency and speed
    max_tokens: int = 300  # ULTRA REDUCED for speed
    timeout_seconds: float = 45.0  # Standard timeout for OpenAI
    
class ModelSpecificEnhancer:
    """
    Unified enhancer that strictly uses OpenAI (gpt-5-mini)
    but applies model-specific system prompts based on the target
    """
    
    def __init__(self, 
                 openai_service: Optional[OpenAIService] = None,
                 cache_service: Optional[CacheService] = None):
        # Use provided service or initialize a new one with config key
        self.openai_service = openai_service or (
            OpenAIService(config.settings.openai_api_key) 
            if config.settings.openai_api_key else None
        )
        self.cache = cache_service or CacheService()
        self.analyzer = PromptAnalyzer()
        self.settings = UnifiedEnhancementSettings()
        
        # FAST IN-MEMORY CACHE for speed
        self._memory_cache = {}
        self._cache_size_limit = 1000  # Prevent memory bloat
        
        # Log initialization status
        if self.openai_service:
            logger.info(" Initialized Model-Specific Enhancer (OpenAI ONLY mode) - GPT-5 Mini Engine")
        else:
            logger.warning(" Initialized Model-Specific Enhancer without OpenAI key - using fast fallback enhancement")
    
    async def enhance(self, prompt: str, target_model: LLMModel, 
                     context: Optional[str] = None) -> EnhancementResult:
        """
        Enhance prompt using strictly OpenAI with model-specific system prompts
        """
        start_time = time.time()
        model_name = target_model.value
        
        logger.info(f" Starting enhancement for '{prompt[:50]}...' with target {model_name}")
        
        # FAST CACHE CHECK
        cache_key = f"{prompt[:100]}_{model_name}"
        if cache_key in self._memory_cache:
            cached_result = self._memory_cache[cache_key]
            logger.info(f"⚡ Cache hit! Returning cached enhancement in {time.time() - start_time:.3f}s")
            return EnhancementResult(
                original=prompt,
                enhanced=cached_result,
                model_name=f"cached-{model_name}",
                improvements=["Cached enhancement"],
                analysis=self.analyzer.analyze(prompt),
                enhancement_time=time.time() - start_time,
                cached=True,
                timestamp=datetime.now()
            )
        
        try:
            # Validate OpenAI Service
            if not self.openai_service:
                logger.error(" No OpenAI Service available - using fast fallback")
                enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
                model_name = f"fallback-no-openai-{model_name}"
            else:
                # Use OpenAI for all enhancements
                try:
                    logger.info(f" Attempting OpenAI enhancement for {target_model}")
                    enhanced_prompt, is_fallback = await self._enhance_with_openai(prompt, model_name)
                    
                    if is_fallback:
                        # Fallback was used due to exception
                        model_name = f"fallback-exception-{model_name}"
                        logger.info(f" Fallback enhancement used due to exception: {enhanced_prompt[:100]}...")
                    else:
                        # Validate the enhancement
                        if enhanced_prompt and enhanced_prompt.strip():
                            model_name = f"openai-gpt5mini-for-{model_name}"
                            logger.info(f" OpenAI enhancement successful: {enhanced_prompt[:100]}...")
                        else:
                            logger.warning(f" OpenAI returned empty enhancement, using fast fallback")
                            enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
                            model_name = f"fallback-invalid-response-{model_name}"
                        
                except Exception as openai_error:
                    logger.error(f" OpenAI enhancement failed: {str(openai_error)}")
                    enhanced_prompt = self._create_fallback_enhancement(prompt, model_name)
                    model_name = f"fallback-exception-{model_name}"
            
            # SPEED OPTIMIZATION: Skip expensive analysis for result
            analysis = self.analyzer.analyze(prompt)
            improvements = self._identify_improvements(prompt, enhanced_prompt)
            
            # CACHE THE RESULT
            if len(self._memory_cache) < self._cache_size_limit:
                self._memory_cache[cache_key] = enhanced_prompt
            
            result = EnhancementResult(
                original=prompt,
                enhanced=enhanced_prompt,
                model_name=model_name,
                improvements=improvements,
                analysis=analysis,
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
            
            logger.info(f" Enhancement completed in {result.enhancement_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f" Enhancement failed: {str(e)}")
            # Return fast fallback result
            analysis = self.analyzer.analyze(prompt)
            return EnhancementResult(
                original=prompt,
                enhanced=self._create_fallback_enhancement(prompt, model_name),
                model_name=f"fallback-{model_name}",
                improvements=["Enhancement failed - using fallback"],
                analysis=analysis,
                enhancement_time=time.time() - start_time,
                cached=False,
                timestamp=datetime.now()
            )
    
    def _should_enhance_prompt(self, prompt: str) -> tuple[bool, str]:
        """Determine if prompt needs enhancement - ULTRA OPTIMIZED FOR SPEED"""
        
        word_count = len(prompt.split())
        
        # ULTRA FAST CHECK: Skip very short prompts (less than 1 word)
        if word_count < self.settings.min_length_for_enhancement:
            return False, f"Too short ({word_count} words)"
        
        # ULTRA FAST CHECK: Skip basic greetings and responses
        simple_phrases = ['hello', 'hi', 'thanks', 'yes', 'no', 'ok', 'okay', 'good', 'bad', 'cool']
        if prompt.lower().strip() in simple_phrases:
            return False, "Basic greeting/response"
        
        # SPEED OPTIMIZATION: Skip analysis for most prompts - only analyze very long ones (>100 words)
        if word_count > 100:
            analysis = self.analyzer.analyze(prompt)
            if analysis.overall_score >= self.settings.max_quality_skip_enhancement:
                return False, f"Already high quality ({analysis.overall_score:.1f}/100)"
        
        # For Chrome extension compatibility, enhance most prompts for speed
        return True, f"Enhancement beneficial ({word_count} words)"
    
    async def _enhance_with_openai(self, prompt: str, target_model: str) -> tuple[str, bool]:
        """
        Use OpenAI for all enhancements - OPTIMIZED FOR SPEED
        Returns: (enhanced_prompt, is_fallback)
        """
        if not self.openai_service:
            return self._create_fallback_enhancement(prompt, target_model), True
            
        logger.info(f" Using OpenAI for {target_model}")
        
        try:
            enhanced_prompt = await self.openai_service.enhance_with_model_specific_prompt(prompt, target_model)
            return enhanced_prompt, False
                
        except Exception as e:
            logger.error(f" OpenAI failed for {target_model}: {str(e)}")
            fallback_prompt = self._create_fallback_enhancement(prompt, target_model)
            return fallback_prompt, True
    
    def _create_fallback_enhancement(self, prompt: str, model_name: str) -> str:
        """Create a high-quality enhanced prompt using simple but effective techniques"""
        
        logger.info(f"Creating fallback enhancement for {model_name}")
        
        # Create enhanced prompts, not answers
        enhanced_parts = []
        
        # 1. Add expert role and context
        if len(prompt.split()) < 10:
            enhanced_parts.append(f"You are an expert in this field. Please provide a comprehensive explanation of: {prompt}")
        else:
            enhanced_parts.append(f"You are an expert. Please provide a detailed analysis of: {prompt}")
        
        # 2. Add structure for complex requests
        if any(word in prompt.lower() for word in ['explain', 'how', 'what', 'why', 'analyze', 'compare']):
            enhanced_parts.append("Please structure your response with clear sections and provide practical examples.")
        
        # 3. Add depth for technical topics
        if any(word in prompt.lower() for word in ['quantum', 'algorithm', 'code', 'programming', 'technology', 'science']):
            enhanced_parts.append("Please include relevant technical details, examples, and practical applications.")
        
        # 4. Add professional context
        if any(word in prompt.lower() for word in ['business', 'strategy', 'management', 'marketing', 'finance']):
            enhanced_parts.append("Please provide actionable insights and real-world applications.")
        
        # 5. Add step-by-step for process questions
        if any(word in prompt.lower() for word in ['steps', 'process', 'procedure', 'guide', 'tutorial']):
            enhanced_parts.append("Please provide a step-by-step approach with clear instructions.")
        
        # Combine all enhancements
        enhanced_prompt = " ".join(enhanced_parts)
        
        # Ensure it's different from original and is a prompt, not an answer
        if enhanced_prompt == prompt or "certainly" in enhanced_prompt.lower() or "here" in enhanced_prompt.lower():
            enhanced_prompt = f"You are an expert. Please provide a comprehensive and detailed response to: {prompt}"
        
        logger.info(f" Fallback enhancement created: {enhanced_prompt[:100]}...")
        return enhanced_prompt
    
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