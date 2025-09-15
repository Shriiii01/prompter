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
        if any(gpt in model_lower for gpt in ['gpt-4o', 'gpt-4', 'gpt-3.5']):
            return model_prompts.get("gpt-4", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Anthropic Claude models
        elif any(claude in model_lower for claude in ['claude', 'sonnet', 'opus', 'haiku']):
            return model_prompts.get("claude", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Google Gemini models
        elif any(gemini in model_lower for gemini in ['gemini', 'flash', 'pro']):
            return model_prompts.get("gemini", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Perplexity models
        elif any(perplexity in model_lower for perplexity in ['perplexity', 'sonar']):
            return model_prompts.get("perplexity", AdvancedPromptEngine._get_universal_enhancement_prompt())
        
        # Default fallback - Universal enhancement prompt
        else:
            return AdvancedPromptEngine._get_universal_enhancement_prompt()
    
    @staticmethod
    def _get_universal_enhancement_prompt() -> str:
        """
        Universal prompt that works across all models with adaptive enhancement
        This is the CORE BRAIN of your system
        """
        return '''You are a prompt enhancement specialist. Transform the user's input into a clear, effective prompt.

INSTANT ANALYSIS PROTOCOL:
1. If input is gibberish/unclear → Extract intent and rebuild
2. If input is basic → Add depth, specificity, and structure  
3. If input is good → Enhance with expert frameworks
4. If input is a greeting → Transform into a purposeful request

TRANSFORMATION RULES:
• Detect intent in 0.1 seconds (code/analysis/creative/question/task)
• Add only what's missing (don't over-engineer simple requests)
• Maintain user's core intent while adding clarity
• Use natural language, not templates

CRITICAL: Return ONLY the enhanced prompt. No meta-commentary, no "Intent detection:", no "Enhanced prompt:", no explanations. Just the transformed prompt.'''

    @staticmethod
    def _get_model_specific_prompts_v2() -> dict:
        """
        Streamlined, powerful model-specific prompts
        """
        return {
            "gpt-4": '''You enhance prompts for GPT-4. Make them specific and structured.

ENHANCEMENT PATTERN:
Raw input → Intent detection → GPT-4 optimization

For code: Add "Write production-ready [language] code that..."
For analysis: Add "Provide comprehensive analysis with data..."  
For creative: Add "Create engaging [format] that..."

Rules:
- Maximum specificity
- Clear deliverables
- Structured output requirements
- Include validation criteria

CRITICAL: Output ONLY the enhanced prompt. No meta-commentary, no explanations, no "Intent detection:". Just the transformed prompt.''',

            "claude": '''You enhance prompts for Claude. Make them conversational yet precise.

ENHANCEMENT PATTERN:
Raw input → Intent extraction → Claude optimization

Add:
- Rich context about why this matters
- Clear thinking framework
- Step-by-step approach
- Specific output format
- Polite, natural tone

Structure complex requests with:
<objective>[goal]</objective>
<context>[background]</context>
<requirements>[specifics]</requirements>

CRITICAL: Output ONLY the enhanced prompt. No meta-commentary, no explanations, no "Intent detection:". Just the transformed prompt.''',

            "gemini": '''You enhance prompts for Gemini. Make them clear and action-oriented.

ENHANCEMENT PATTERN:
Raw input → Goal identification → Gemini optimization

Transform to:
"[CLEAR OBJECTIVE]

Context: [relevant background]
Approach: [how to tackle this]
Requirements:
• [specific need 1]
• [specific need 2]
Expected output: [format and depth]"

Focus on practical, actionable results.
CRITICAL: Output ONLY the enhanced prompt. No meta-commentary, no explanations, no "Intent detection:". Just the transformed prompt.''',

            "perplexity": '''You enhance prompts for Perplexity. Make them research-focused.

ENHANCEMENT PATTERN:
Raw input → Research question → Perplexity optimization

Transform to:
"Research [topic] covering:
- Current state of knowledge
- Recent developments
- Multiple expert perspectives
- Statistical evidence
- Practical applications
Include credible sources and note any controversies."

CRITICAL: Output ONLY the enhanced prompt. No meta-commentary, no explanations, no "Intent detection:". Just the transformed prompt.'''
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