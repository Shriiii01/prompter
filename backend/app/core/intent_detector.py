import re
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
from openai import OpenAI  # You can swap this with other clients (e.g., Claude)

class PromptIntent(Enum):
    CODING = "coding"
    WRITING = "writing"
    QUESTION = "question"
    CREATIVE = "creative"
    ANALYSIS = "analysis"
    CONVERSATION = "conversation"
    TASK_COMPLETION = "task_completion"
    EXPLANATION = "explanation"
    TRANSLATION = "translation"
    BRAINSTORMING = "brainstorming"
    DEBUGGING = "debugging"
    REVIEW = "review"
    UNKNOWN = "unknown"

@dataclass
class IntentResult:
    primary_intent: PromptIntent
    secondary_intents: List[PromptIntent]
    confidence: float
    indicators: List[str]
    context_type: str
    complexity_level: str

class LLMIntentDetector:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)

    def detect_intent(self, prompt: str) -> IntentResult:
        system_prompt = (
            "You are an advanced language model specialized in understanding user intent.\n"
            "Your task is to analyze the following user prompt and classify it into ONE of the following categories:\n"
            "- coding\n"
            "- writing\n"
            "- question\n"
            "- creative\n"
            "- analysis\n"
            "- conversation\n"
            "- task_completion\n"
            "- explanation\n"
            "- translation\n"
            "- brainstorming\n"
            "- debugging\n"
            "- review\n"
            "Respond with only the intent label. Nothing else."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Prompt:\n{prompt}"}
        ]

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.0
        )

        label = response.choices[0].message.content.strip().lower()

        try:
            primary_intent = PromptIntent(label)
        except ValueError:
            primary_intent = PromptIntent.UNKNOWN

        return IntentResult(
            primary_intent=primary_intent,
            secondary_intents=[],
            confidence=0.95,
            indicators=["llm_classified"],
            context_type="general",
            complexity_level="medium"
        )

class IntentDetector:
    """Rule-based intent detector for fallback when LLM is unavailable"""
    
    def __init__(self):
        # Define patterns for each intent type
        self.intent_patterns = {
            PromptIntent.CODING: {
                'keywords': [
                    'code', 'python', 'javascript', 'java', 'c++', 'html', 'css',
                    'function', 'class', 'method', 'algorithm', 'script', 'program',
                    'debug', 'fix', 'error', 'bug', 'compile', 'syntax', 'api',
                    'database', 'sql', 'query', 'framework', 'library', 'package'
                ],
                'patterns': [
                    r'write\s+(?:a\s+)?(?:python|js|java|c\+\+|html|css|sql)',
                    r'create\s+(?:a\s+)?(?:function|class|method|script)',
                    r'fix\s+(?:this\s+)?(?:code|error|bug)',
                    r'debug\s+(?:this\s+)?(?:code|script|function)',
                    r'implement\s+(?:a\s+)?(?:function|algorithm|feature)',
                    r'how\s+to\s+(?:code|program|write)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.WRITING: {
                'keywords': [
                    'write', 'essay', 'article', 'blog', 'story', 'paragraph',
                    'report', 'email', 'letter', 'content', 'copy', 'text',
                    'draft', 'proofread', 'edit', 'grammar', 'style', 'tone'
                ],
                'patterns': [
                    r'write\s+(?:a\s+)?(?:essay|article|blog|story|email|letter)',
                    r'create\s+(?:a\s+)?(?:story|article|blog|content)',
                    r'draft\s+(?:a\s+)?(?:email|letter|report)',
                    r'proofread\s+(?:this\s+)?(?:text|essay|article)',
                    r'improve\s+(?:this\s+)?(?:writing|text|essay)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.QUESTION: {
                'keywords': [
                    'what', 'why', 'how', 'when', 'where', 'who', 'which',
                    'explain', 'define', 'describe', 'tell', 'know', 'understand'
                ],
                'patterns': [
                    r'^(?:what|why|how|when|where|who|which)',
                    r'(?:can\s+you\s+)?(?:explain|define|describe|tell\s+me)',
                    r'(?:i\s+want\s+to\s+)?(?:know|understand|learn)',
                    r'what\s+(?:is|are|does|do)',
                    r'how\s+(?:does|do|can|to)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.CREATIVE: {
                'keywords': [
                    'creative', 'imagine', 'invent', 'design', 'brainstorm',
                    'poem', 'story', 'lyrics', 'character', 'plot', 'scene',
                    'artwork', 'concept', 'idea', 'inspiration', 'original'
                ],
                'patterns': [
                    r'(?:create|write|compose)\s+(?:a\s+)?(?:poem|story|song|lyrics)',
                    r'(?:imagine|invent|design)\s+(?:a\s+)?(?:character|world|concept)',
                    r'brainstorm\s+(?:some\s+)?(?:ideas|concepts|names)',
                    r'come\s+up\s+with\s+(?:a\s+)?(?:story|idea|concept)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.ANALYSIS: {
                'keywords': [
                    'analyze', 'compare', 'evaluate', 'assess', 'review',
                    'examine', 'critique', 'study', 'investigate', 'research',
                    'pros', 'cons', 'advantages', 'disadvantages', 'benefits'
                ],
                'patterns': [
                    r'(?:analyze|compare|evaluate|assess)\s+(?:this\s+)?(?:data|text|code)',
                    r'(?:what\s+are\s+the\s+)?(?:pros\s+and\s+cons|advantages\s+and\s+disadvantages)',
                    r'(?:review|critique|examine)\s+(?:this\s+)?(?:document|article|code)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.CONVERSATION: {
                'keywords': [
                    'hello', 'hi', 'hey', 'greetings', 'chat', 'talk', 'discuss',
                    'conversation', 'friendly', 'casual', 'how are you', 'thanks', 'thank you'
                ],
                'patterns': [
                    r'^(?:hello|hi|hey|greetings)',
                    r'how\s+are\s+you',
                    r'(?:let\'s\s+)?(?:chat|talk|discuss)',
                    r'(?:thanks|thank\s+you)',
                    r'(?:good\s+)?(?:morning|afternoon|evening)',
                ],
                'weight': 0.8
            },
            
            PromptIntent.TASK_COMPLETION: {
                'keywords': [
                    'complete', 'finish', 'do', 'perform', 'execute', 'run',
                    'task', 'job', 'work', 'assignment', 'project', 'help'
                ],
                'patterns': [
                    r'(?:help\s+me\s+)?(?:complete|finish|do)\s+(?:this\s+)?(?:task|job|work)',
                    r'(?:can\s+you\s+)?(?:help|assist)\s+(?:me\s+)?(?:with|to)',
                    r'(?:i\s+need\s+)?(?:help|assistance)\s+(?:with|to)',
                ],
                'weight': 0.9
            },
            
            PromptIntent.EXPLANATION: {
                'keywords': [
                    'explain', 'clarify', 'elaborate', 'detail', 'breakdown',
                    'walk through', 'step by step', 'tutorial', 'guide', 'how to'
                ],
                'patterns': [
                    r'(?:explain|clarify|elaborate)\s+(?:this\s+)?(?:concept|idea|process)',
                    r'(?:walk\s+me\s+through|guide\s+me\s+through)',
                    r'(?:step\s+by\s+step|tutorial)\s+(?:on\s+how\s+to)',
                    r'(?:break\s+down|breakdown)\s+(?:this\s+)?(?:concept|process)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.DEBUGGING: {
                'keywords': [
                    'debug', 'fix', 'error', 'bug', 'issue', 'problem',
                    'troubleshoot', 'solve', 'broken', 'not working'
                ],
                'patterns': [
                    r'(?:debug|fix|solve)\s+(?:this\s+)?(?:error|bug|issue|problem)',
                    r'(?:why\s+(?:is|does))\s+(?:this\s+)?(?:not\s+working|broken)',
                    r'troubleshoot\s+(?:this\s+)?(?:issue|problem)',
                ],
                'weight': 1.0
            },
            
            PromptIntent.REVIEW: {
                'keywords': [
                    'review', 'check', 'look at', 'examine', 'feedback',
                    'critique', 'assess', 'evaluate', 'opinion'
                ],
                'patterns': [
                    r'(?:review|check|examine)\s+(?:this\s+)?(?:code|document|text)',
                    r'(?:give\s+me\s+)?(?:feedback|opinion)\s+(?:on\s+)?(?:this\s+)?',
                    r'(?:can\s+you\s+)?(?:look\s+at|assess)\s+(?:this\s+)?',
                ],
                'weight': 1.0
            }
        }
    
    def detect_intent(self, prompt: str) -> IntentResult:
        """Detect the primary intent of a prompt using rule-based patterns"""
        
        # Convert to lowercase for analysis
        prompt_lower = prompt.lower()
        
        # Score each intent
        intent_scores = {}
        intent_indicators = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            indicators = []
            
            # Check keywords
            for keyword in patterns['keywords']:
                if keyword in prompt_lower:
                    score += 1
                    indicators.append(f"keyword: {keyword}")
            
            # Check regex patterns
            for pattern in patterns['patterns']:
                if re.search(pattern, prompt_lower):
                    score += 2  # Patterns are stronger indicators
                    indicators.append(f"pattern: {pattern}")
            
            # Apply weight
            final_score = score * patterns['weight']
            
            if final_score > 0:
                intent_scores[intent] = final_score
                intent_indicators[intent] = indicators
        
        # Determine primary and secondary intents
        if not intent_scores:
            return IntentResult(
                primary_intent=PromptIntent.UNKNOWN,
                secondary_intents=[],
                confidence=0.0,
                indicators=["no_patterns_matched"],
                context_type="general",
                complexity_level="simple"
            )
        
        # Sort by score
        sorted_intents = sorted(intent_scores.items(), key=lambda x: x[1], reverse=True)
        primary_intent = sorted_intents[0][0]
        primary_score = sorted_intents[0][1]
        
        # Get secondary intents (those with significant scores)
        secondary_intents = []
        threshold = primary_score * 0.6  # 60% of primary score
        for intent, score in sorted_intents[1:]:
            if score >= threshold:
                secondary_intents.append(intent)
        
        # Calculate confidence based on score strength
        max_possible_score = 10  # Rough estimate
        confidence = min(primary_score / max_possible_score, 1.0)
        
        # Determine context type and complexity
        context_type = self._determine_context_type(prompt, primary_intent)
        complexity_level = self._determine_complexity(prompt)
        
        return IntentResult(
            primary_intent=primary_intent,
            secondary_intents=secondary_intents,
            confidence=confidence,
            indicators=intent_indicators.get(primary_intent, []),
            context_type=context_type,
            complexity_level=complexity_level
        )
    
    def _determine_context_type(self, prompt: str, primary_intent: PromptIntent) -> str:
        """Determine the context type of the prompt"""
        prompt_lower = prompt.lower()
        
        # Technical context
        technical_keywords = ['api', 'database', 'server', 'framework', 'library', 'algorithm']
        if any(keyword in prompt_lower for keyword in technical_keywords):
            return "technical"
        
        # Academic context
        academic_keywords = ['research', 'study', 'paper', 'thesis', 'academic', 'university']
        if any(keyword in prompt_lower for keyword in academic_keywords):
            return "academic"
        
        # Business context
        business_keywords = ['business', 'company', 'market', 'strategy', 'profit', 'customer']
        if any(keyword in prompt_lower for keyword in business_keywords):
            return "business"
        
        # Personal context
        personal_keywords = ['personal', 'myself', 'my life', 'family', 'friend']
        if any(keyword in prompt_lower for keyword in personal_keywords):
            return "personal"
        
        return "general"
    
    def _determine_complexity(self, prompt: str) -> str:
        """Determine the complexity level of the prompt"""
        # Simple heuristics based on length and structure
        if len(prompt) < 20:
            return "simple"
        elif len(prompt) < 100:
            return "medium"
        else:
            return "complex"