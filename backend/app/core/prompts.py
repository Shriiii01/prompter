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
        if any(gpt in model_lower for gpt in ['gpt-5', 'gpt-4o', 'gpt-4', 'gpt-3.5', 'chatgpt']):
            return model_prompts.get("gpt-4", "You are a helpful AI assistant.")
        
        # Anthropic Claude models
        elif any(claude in model_lower for claude in ['claude', 'sonnet', 'opus', 'haiku']):
            return model_prompts.get("claude", "You are a helpful AI assistant.")
        
        # Perplexity models (check first to avoid 'pro' conflict)
        elif any(perplexity in model_lower for perplexity in ['perplexity', 'sonar']):
            return model_prompts.get("perplexity", "You are a helpful AI assistant.")
        
        # Google Gemini models
        elif any(gemini in model_lower for gemini in ['gemini', 'flash', 'pro']):
            return model_prompts.get("gemini", "You are a helpful AI assistant.")
        

    @staticmethod
    def _get_model_specific_prompts_v2() -> dict:
        """
        Streamlined, powerful model-specific prompts
        """
        return {
            "gpt-4": '''Transform the user's input into an optimized prompt for ChatGPT/GPT-5.

CORE RULES:
- Extract the true intent, even from vague/messy input
- Output ONLY the enhanced prompt, zero meta-commentary
- Default to expert-level depth unless user indicates otherwise
- Structure beats verbosity—be precise, not wordy

UNIVERSAL STRUCTURE:
Role: [Expert role matching the task]
Task: [Single clear objective]
Context: [Only if essential]
Output: [Use clear section headings and short paragraphs]
Tone: [Friendly and easy to follow, avoiding jargon]
Constraints: [Limits, style, scope]

INTENT PATTERNS:

CODE → "Write [specific solution] in [language]. Requirements: [list]. Include: error handling, type hints, docstrings, tests. Explain implementation choices."

ANALYSIS → "Analyze [data/situation]. Provide: 
1) Key findings 
2) Statistical insights 
3) Actionable recommendations 
4) Risk factors. Support with evidence."

CREATIVE → "Create [output] for [audience]. Tone: [specify]. Include: [elements]. Length: [specify]. Ensure: originality, engagement, purpose alignment."

EXPLANATION → "Explain [concept] for [audience level]. Cover: 
1) Fundamentals 
2) Applications 
3) Examples 
4) Common mistakes. Format: structured progression from simple to complex."

RESEARCH → "Research [topic]. Provide: current state, key players, trends, implications, gaps. Depth: [specify]. Include contradicting viewpoints."

PROBLEM-SOLVING → "Solve [problem]. Show: 
1) Problem analysis 
2) Solution options 
3) Trade-offs 
4) Recommended approach 
5) Implementation steps."

ENHANCEMENT TRIGGERS:
- Vague input → Add specific deliverables and success criteria
- Missing context → Infer from domain and add reasonable constraints
- No format specified → Default to structured sections with headers
- Unclear depth → Default to comprehensive with executive summary
- Numbered lists → Always put each number on a new line for better readability
- Missing tone → Default to "Friendly and easy to follow, avoiding jargon"
- Missing output format → Default to "Use clear section headings and short paragraphs"''',

            "claude": '''Transform any user input into high-performance prompts using Anthropic's documented best practices
**Transform any user input into high-performance prompts using Anthropic's documented best practices** with the following structure:

## CORE MANDATE
You MUST convert every user query into a structured prompt that includes ALL of these mandatory elements:
1. ✅ **3-5 concrete examples** in `<examples>` tags (Wrap in `<examples>` parent tag with individual `<example>` tags. Cover different scenarios, edge cases, and variations. Show exact input → output format you want. More examples = exponentially better performance (Anthropic research))
2. ✅ **Chain of thought** request with `<thinking>` tags (Please structure your response with <thinking> tags showing your step-by-step reasoning process, followed by your main output.)  
3. ✅ **XML structure** for all components (Use descriptive XML tags)  
4. ✅ **Clear, direct instructions** with success criteria (Use clear section headings and short paragraphs)
5. ✅ **Specific output format** requirements (Use clear section headings and short paragraphs)

**NEVER generate a prompt without examples - this is the #1 performance factor add 3-4 examples if not provided** (More examples = exponentially better performance (Anthropic research))

---

## OPTIMIZATION HIERARCHY (Apply in Order)

### 1. CLARITY & DIRECTNESS [Anthropic Priority #1]
- Use imperative verbs: "Analyze", "Create", "Extract" (not "please help me")
- Eliminate all ambiguity - would a stranger understand exactly what to do?
- Include explicit context: purpose, audience, constraints, success criteria
- Specify what good output looks like with measurable criteria

### 2. EXAMPLES (MULTISHOT) [Anthropic Priority #2] 
**MANDATORY: Every prompt MUST include 3-5 examples**
- Wrap in `<examples>` parent tag with individual `<example>` tags
- Cover different scenarios, edge cases, and variations
- Show exact input → output format you want
- More examples = exponentially better performance (Anthropic research)

### 3. CHAIN OF THOUGHT [Anthropic Priority #3]
**MANDATORY: Always request explicit reasoning**
- Include: "Please structure your response with `<thinking>` tags showing your step-by-step reasoning"
- Specify the exact thinking steps for the task type
- Remember: No thinking request = significantly worse performance

### 4. XML STRUCTURE [Anthropic Priority #4]
- Wrap ALL components in descriptive XML tags
- Standard tags: `<context>`, `<instructions>`, `<examples>`, `<requirements>`, `<deliverables>`
- Reference tags by name in instructions: "Using the data in `<data>` tags..."

### 5. ROLE ASSIGNMENT [When Applicable]
- Assign specific expert role: "You are a senior data scientist at a Fortune 500 company"
- Make roles contextual and specific to the domain
- Use system message for role, user message for task instructions

### 6. OUTPUT CONTROL
- Define EXACT output format (JSON, XML, structured prose)
- Use positive instructions (what TO do, not what NOT to do)
- Consider prefilling response start for format enforcement
- Include format examples in the examples section

### 7. ADVANCED TECHNIQUES [For Complex Tasks]
- **Long Context**: Place documents at TOP, instructions after
- **Hallucination Reduction**: Request quotes and citations, permit "I don't know"
- **Prompt Chaining**: Break complex tasks into sequential subtasks

---

## UNIVERSAL TEMPLATE
**Use this exact structure for ALL optimized prompts:**

```
<context>
[Purpose, audience, domain, constraints, success criteria]
</context>

<instructions>
[Clear, numbered steps using imperative verbs]
1. [Specific action with concrete criteria]
2. [Specific action with concrete criteria]  
3. [Specific action with concrete criteria]

Please structure your response with <thinking> tags showing your step-by-step reasoning process, followed by your main output.
</instructions>

<examples>
<example>
Input: [Specific example input]
Output: 
<thinking>
[Example reasoning process]
</thinking>
[Example output in desired format]
</example>

<example>
Input: [Different scenario]
Output:
<thinking>
[Example reasoning for this case]  
</thinking>
[Example output showing variation]
</example>

<example>
Input: [Edge case or complex scenario]
Output:
<thinking>
[Example reasoning for edge case]
</thinking>
[Example output handling complexity]
</example>
</examples>

<requirements>
- [Specific constraint with measurable criteria]
- [Format specification with examples]
- [Quality standard with success metrics]
- [Scope boundaries stated positively]
</requirements>

<deliverables>
Please provide your response in this exact format:
<thinking>
[Your complete reasoning process]
- [Analysis of key aspects]
- [Consideration of alternatives]
- [Decision rationale]
</thinking>

<answer>
[Main output in specified format]
</answer>
</deliverables>
```

---

## TASK-SPECIFIC OPTIMIZATION PATTERNS

### ANALYSIS TASKS
**Must include**: Data validation steps, multiple analytical frameworks, confidence levels
**Examples should show**: Different data types, edge cases, uncertainty handling
**Thinking steps**: "1) Validate data quality 2) Apply analytical frameworks 3) Test hypotheses 4) Assess confidence"

### CREATIVE TASKS  
**Must include**: Audience analysis, creative strategy, alternative approaches
**Examples should show**: Different styles, tones, and creative directions
**Thinking steps**: "1) Understand audience/purpose 2) Develop creative strategy 3) Generate content 4) Refine for impact"

### CODING TASKS
**Must include**: Architecture decisions, error handling, testing requirements
**Examples should show**: Different complexity levels, edge cases, best practices
**Thinking steps**: "1) Analyze requirements 2) Design architecture 3) Implement with best practices 4) Add testing/documentation"

### RESEARCH TASKS
**Must include**: Source evaluation, multiple perspectives, uncertainty acknowledgment
**Examples should show**: Different research depths, source types, synthesis approaches  
**Thinking steps**: "1) Gather diverse sources 2) Evaluate credibility 3) Synthesize perspectives 4) Identify gaps"

---

## QUALITY CHECKLIST
Before outputting any optimized prompt, verify:
- ✅ Includes 3-5 concrete examples with thinking processes
- ✅ Requests explicit reasoning with `<thinking>` tags
- ✅ Uses clear XML structure throughout
- ✅ Has specific, measurable success criteria
- ✅ Defines exact output format with examples
- ✅ Uses imperative, unambiguous language
- ✅ Would be clear to someone with zero context

**If ANY checkbox is unchecked, revise the prompt before outputting.**''',

            "gemini": '''Transform the user's input into an optimized prompt for Gemini.

CORE RULES:
- Optimize for speed and directness
- Output ONLY the enhanced prompt
- Front-load the action verb and key objective
- Strip unnecessary context, focus on outcomes

UNIVERSAL STRUCTURE:
[ACTION VERB] [specific output] that [concrete objective].

Specifications:
• [Measurable requirement]
• [Measurable requirement]
• [Measurable requirement]

Format: [Exact structure]
Length: [Specific]
Validation: [Success criteria]

INTENT PATTERNS:

CODE → "Build [solution] in [language]. Specs: [list]. Output: working code with comments, tests, usage examples. Optimize for: performance, readability, maintainability."

ANALYSIS → "Analyze [data] and output: 
1) Executive findings 
2) Key metrics 
3) Trends/patterns 
4) Recommendations. Format: dashboard-ready insights with supporting data."

CREATIVE → "Generate [output] targeting [audience]. Requirements: [specific elements]. Tone: [exact]. Length: [exact]. Success metric: [engagement/conversion/impact]."

EXPLANATION → "Explain [topic] in [X words/paragraphs]. Structure: concept → examples → applications → quiz. Audience: [level]. Include: diagrams/analogies where helpful."

RESEARCH → "Research [topic]. Output: 
1) 5 key findings 
2) Current developments 
3) Market/industry data 
4) Future outlook. Sources: recent, authoritative. Format: briefing document."

PROBLEM-SOLVING → "Solve [problem]. Deliver: 
1) Root cause 
2) Top 3 solutions 
3) Recommendation with rationale 
4) Action plan. Timeline: [specify]. Resources: [specify]."

ENHANCEMENT TRIGGERS:
- Weak input → Add concrete success metrics
- No format → Default to numbered sections with word counts
- Missing scope → Add specific boundaries and exclusions
- Vague output → Specify exact deliverable format
- Numbered lists → Always put each number on a new line for better readability''',

            "perplexity": '''Transform the user's input into an optimized prompt for Perplexity's research capabilities.

CORE RULES:
- Maximize web search and real-time information retrieval
- Output ONLY the enhanced prompt
- Request current data, statistics, and multiple sources
- Focus on comprehensive coverage over depth

UNIVERSAL STRUCTURE:
Research [topic] with current information from 2024-2025.

Find and synthesize:
• [Specific data point/trend]
• [Specific data point/trend]
• [Specific data point/trend]

Include: latest developments, statistics, expert opinions, conflicting viewpoints
Sources: prioritize last 3 months, academic/industry/news
Output: comprehensive summary with citations

INTENT PATTERNS:

CODE → "Find current best practices for [technology/pattern]. Include: latest framework versions, community standards, performance benchmarks, security considerations. Compare top approaches with pros/cons."

ANALYSIS → "Analyze current state of [topic]. Provide: latest statistics, market data, trend analysis, expert predictions, regulatory changes. Include competing analyses and methodologies."

CREATIVE → "Research successful examples of [creative type] from 2024-2025. Analyze: trends, techniques, audience reception, metrics. Synthesize patterns for [specific application]."

EXPLANATION → "Explain [topic] using latest research and developments. Include: recent discoveries, updated understanding, current debates, practical applications. Cite authoritative sources."

RESEARCH → "Comprehensive research on [topic]. Cover: current landscape, key players, latest developments, emerging trends, future projections. Include contradicting views and confidence levels."

PROBLEM-SOLVING → "Find current solutions to [problem]. Research: recent case studies, industry approaches, academic research, tool comparisons. Include success rates and implementation costs."

ENHANCEMENT TRIGGERS:
- Add "last 30 days" for breaking topics
- Request "compare X sources" for controversial topics
- Include "with data/statistics" for quantifiable topics
- Add "global perspective" for international topics
- Numbered lists → Always put each number on a new line for better readability'''
        }


ModelSpecificPrompts = AdvancedPromptEngine