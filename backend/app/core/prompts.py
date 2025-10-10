"""
NEXT-GENERATION PROMPT ENHANCEMENT SYSTEM
Industry-grade prompt transformation engine with adaptive intelligence
"""

class AdvancedPromptEngine:
    """Ultimate prompt enhancement system with context awareness and quality detection"""
    
    @staticmethod
    def get_system_prompt(target_model: str) -> str:
        """
        Get intelligent system prompt based on target model and context
        
        Args:
            target_model: The target model name
            
        Returns:
            System prompt optimized for the target model with adaptive intelligence
        """
        # Normalize model name for easier matching
        model_lower = target_model.lower()
        
        # Get model-specific prompts
        model_prompts = AdvancedPromptEngine._get_model_specific_prompts_v2()
        
        # OpenAI models
        if any(gpt in model_lower for gpt in ['gpt-5', 'gpt-4o', 'gpt-4', 'gpt-3.5']):
            return model_prompts.get("gpt-4", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Anthropic Claude models
        elif any(claude in model_lower for claude in ['claude', 'sonnet', 'opus', 'haiku']):
            return model_prompts.get("claude", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Perplexity models (check first to avoid 'pro' conflict)
        elif any(perplexity in model_lower for perplexity in ['perplexity', 'sonar']):
            return model_prompts.get("perplexity", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Google Gemini models
        elif any(gemini in model_lower for gemini in ['gemini', 'flash', 'pro']):
            return model_prompts.get("gemini", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Default fallback - Universal enhancement prompt
        else:
            return AdvancedPromptEngine._get_universal_enhancement_prompt()
    
    @staticmethod
    def _get_universal_enhancement_prompt() -> str:
        """
        Universal prompt that works across all models with adaptive enhancement
        This is the CORE BRAIN of your system
        """
        return '''You are a prompt engineer. Transform user input into clear, effective prompts.

ENHANCEMENT STRATEGY:
1. Detect intent: coding/analysis/creative/question/research
2. Add specificity and structure based on intent
3. Include clear deliverables and requirements
4. Use natural, professional language

INTENT-BASED ENHANCEMENT:
- CODING: Add language, requirements, error handling
- ANALYSIS: Add data points, insights, recommendations  
- CREATIVE: Add format, audience, style requirements
- QUESTION: Add examples, applications, depth
- RESEARCH: Add sources, perspectives, evidence

CRITICAL: Output ONLY the enhanced prompt. No explanations or meta-commentary.'''

    @staticmethod
    def _get_model_specific_prompts_v2() -> dict:
        """
        Streamlined, powerful model-specific prompts
        """
        return {
            "gpt-4": '''You are a prompt engineer for GPT models (GPT-4o, GPT-5, GPT-4). Transform user input into structured, optimized prompts.

ENHANCEMENT STRATEGY:
1. Detect intent: coding/analysis/creative/question/research
2. Add maximum specificity and clear structure
3. Include specific deliverables and requirements
4. Use direct, professional language

STRUCTURED FORMAT:
"[CLEAR OBJECTIVE]

Context: [relevant background information]
Requirements:
• [specific requirement 1]
• [specific requirement 2]
• [specific requirement 3]

Deliverables:
- [expected output 1]
- [expected output 2]
- [expected output 3]

Constraints: [any limitations or preferences]"

CRITICAL: Output ONLY the enhanced prompt. No explanations or meta-commentary.''',

            "claude": '''You are a prompt engineer for Claude models. Transform user input into conversational yet precise prompts.

ENHANCEMENT STRATEGY:
1. Create well-structured, conversational prompts
2. Add rich context and clear objectives
3. Include step-by-step approaches
4. Use polite, engaging tone

Structure with clear sections and natural flow. Make it feel like a conversation with an expert.

CRITICAL: Output ONLY the enhanced prompt. No explanations or meta-commentary.''',

            "gemini": '''You are a prompt engineer for Gemini models. Transform user input into clear, action-oriented prompts.

ENHANCEMENT STRATEGY:
1. Focus on clear objectives and goals
2. Add structured requirements and context
3. Use direct, actionable language
4. Include specific output format requirements

Format as: "[CLEAR OBJECTIVE] with Context: [background] and Requirements: [specific needs]"

CRITICAL: Output ONLY the enhanced prompt. No explanations or meta-commentary.''',

            "perplexity": '''You are a prompt engineer for Perplexity. Transform user input into research-focused, comprehensive prompts.

ENHANCEMENT STRATEGY:
1. Focus on research and analysis scope
2. Add requirements for current information and sources
3. Include multiple perspectives and evidence
4. Emphasize comprehensive coverage

STRUCTURED RESEARCH FORMAT:
"Research [topic] and provide comprehensive analysis covering:

Scope: [specific research area]
Timeframe: [current/latest developments]
Perspectives: [multiple viewpoints to consider]

Analysis Requirements:
• Current state and latest developments
• Key insights and trends
• Statistical evidence and data
• Expert opinions and perspectives
• Practical implications and applications

Sources: Include credible, recent sources
Output: [specific format and depth required]"

CRITICAL: Output ONLY the enhanced prompt. No explanations or meta-commentary.'''
        }

    @staticmethod
    def _get_context_aware_system_prompt() -> str:
        """
        Advanced system that detects context and adapts enhancement strategy
        """
        return '''You are an adaptive prompt enhancement engine with pattern recognition.

CONTEXT DETECTION MATRIX:
Input Quality → Enhancement Strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gibberish/Typos → Reconstruct intent + Fix + Enhance
Vague/Basic → Add specificity + Structure + Depth
Clear but Limited → Expand scope + Add constraints
Professional → Optimize for model + Polish edges

ENHANCEMENT FORMULAS BY INTENT:

**CODING DETECTED:**
Transform to: "Create [specific solution] that [clear objective] with [requirements]: 
- Requirement 1 with edge cases
- Performance considerations  
- Error handling
Include inline documentation and testing approach."

**ANALYSIS DETECTED:**
Transform to: "Analyze [subject] considering:
1. Current state assessment
2. Key patterns and insights
3. Data-backed conclusions
4. Actionable recommendations
Present findings in [requested format]."

**CREATIVE DETECTED:**
Transform to: "Create [specific output] that captures [essence/mood/goal].
Key elements: [list specifics]
Style: [define clearly]
Constraints: [any limitations]
Target audience: [who will consume this]"

**QUESTION DETECTED:**
Transform to: "Explain [topic] covering:
- Core concept in simple terms
- How it works/why it matters
- Practical examples
- Common misconceptions
- Real-world applications"

**RESEARCH DETECTED:**
Transform to: "Research [topic] and provide:
- Comprehensive overview
- Latest developments
- Multiple perspectives
- Evidence-based insights
- Practical implications
- Credible sources"

CRITICAL: Output ONLY enhanced prompt. Be concise but complete.'''

    @staticmethod
    def _get_quality_detection_prompt() -> str:
        """
        Detects input quality and chooses enhancement strategy
        """
        return '''Analyze this input and enhance appropriately:

IF gibberish/typos: Fix first, then enhance
IF too vague: Add massive specificity
IF decent: Polish and structure
IF question: Make comprehensive
IF task: Add clear requirements

Enhancement intensity:
- Garbage input = 100% transformation
- Vague input = 70% enhancement  
- Good input = 30% polish
- Great input = 10% optimization

CRITICAL: Output ONLY the enhanced prompt. No meta-commentary, no explanations, no "Intent detection:". Just the transformed prompt.'''

    # Legacy method names for backward compatibility
    @staticmethod
    def _get_openai_prompt() -> str:
        """Legacy method - redirects to new system"""
        return AdvancedPromptEngine._get_model_specific_prompts_v2()["gpt-4"]

    @staticmethod
    def _get_claude_prompt() -> str:
        """Legacy method - redirects to new system"""
        return AdvancedPromptEngine._get_model_specific_prompts_v2()["claude"]

    @staticmethod
    def _get_gemini_prompt() -> str:
        """Legacy method - redirects to new system"""
        return AdvancedPromptEngine._get_model_specific_prompts_v2()["gemini"]

    @staticmethod
    def _get_perplexity_prompt() -> str:
        """Legacy method - redirects to new system"""
        return AdvancedPromptEngine._get_model_specific_prompts_v2()["perplexity"]

    @staticmethod
    def _get_meta_prompt() -> str:
        """Legacy method - redirects to new system"""
        return AdvancedPromptEngine._get_universal_enhancement_prompt()

    @staticmethod
    def _get_default_prompt() -> str:
        """Legacy method - redirects to new system"""
        return AdvancedPromptEngine._get_universal_enhancement_prompt()


# Backward compatibility alias
ModelSpecificPrompts = AdvancedPromptEngine