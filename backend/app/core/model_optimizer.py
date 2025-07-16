from typing import Dict, List, Optional
from dataclasses import dataclass
from app.core.intent_detector import PromptIntent, IntentResult
from app.models.request import LLMModel

@dataclass
class ModelOptimization:
    """Optimization strategy for a specific model"""
    prefix_templates: List[str]
    suffix_templates: List[str]
    structure_patterns: List[str]
    specific_instructions: List[str]
    formatting_rules: List[str]
    examples: List[str]

class ModelOptimizer:
    """Optimizes prompts for specific AI models"""
    
    def __init__(self):
        self.model_strategies = {
            LLMModel.CLAUDE_35_SONNET: self._get_claude_strategy(),
            LLMModel.CLAUDE: self._get_claude_strategy(),
            LLMModel.CLAUDE_SONNET: self._get_claude_strategy(),
            LLMModel.GPT4: self._get_gpt4_strategy(),
            LLMModel.GPT35: self._get_gpt35_strategy(),
            LLMModel.GEMINI: self._get_gemini_strategy()
        }
    
    def optimize_for_model(self, 
                          prompt: str, 
                          target_model: LLMModel,
                          intent_result: IntentResult,
                          enhancement_level: str = "medium") -> str:
        """Optimize prompt for specific model"""
        
        # Get model-specific strategy
        strategy = self.model_strategies.get(target_model)
        if not strategy:
            return prompt  # No optimization available
        
        # Apply model-specific optimizations
        optimized_prompt = self._apply_model_optimization(
            prompt, strategy, intent_result, enhancement_level
        )
        
        return optimized_prompt
    
    def _apply_model_optimization(self, 
                                 prompt: str, 
                                 strategy: Dict,
                                 intent_result: IntentResult,
                                 enhancement_level: str) -> str:
        """Apply model-specific optimization strategy"""
        
        # Get intent-specific optimizations
        intent_optimizations = strategy.get(intent_result.primary_intent.value, {})
        
        # Build the optimized prompt
        optimized_parts = []
        
        # Add model-specific prefix
        prefix = self._get_appropriate_prefix(
            strategy, intent_result, enhancement_level
        )
        if prefix:
            optimized_parts.append(prefix)
        
        # Add context and structure
        structured_prompt = self._apply_structure(
            prompt, strategy, intent_result, enhancement_level
        )
        optimized_parts.append(structured_prompt)
        
        # Add model-specific suffix
        suffix = self._get_appropriate_suffix(
            strategy, intent_result, enhancement_level
        )
        if suffix:
            optimized_parts.append(suffix)
        
        return "\n\n".join(optimized_parts)
    
    def _get_appropriate_prefix(self, 
                               strategy: Dict, 
                               intent_result: IntentResult,
                               enhancement_level: str) -> Optional[str]:
        """Get appropriate prefix based on intent and enhancement level"""
        
        prefixes = strategy.get("prefixes", {})
        
        # Try to get intent-specific prefix
        if intent_result.primary_intent.value in prefixes:
            intent_prefixes = prefixes[intent_result.primary_intent.value]
            if enhancement_level in intent_prefixes:
                return intent_prefixes[enhancement_level]
        
        # Fallback to general prefix
        general_prefixes = prefixes.get("general", {})
        return general_prefixes.get(enhancement_level)
    
    def _get_appropriate_suffix(self, 
                               strategy: Dict, 
                               intent_result: IntentResult,
                               enhancement_level: str) -> Optional[str]:
        """Get appropriate suffix based on intent and enhancement level"""
        
        suffixes = strategy.get("suffixes", {})
        
        # Try to get intent-specific suffix
        if intent_result.primary_intent.value in suffixes:
            intent_suffixes = suffixes[intent_result.primary_intent.value]
            if enhancement_level in intent_suffixes:
                return intent_suffixes[enhancement_level]
        
        # Fallback to general suffix
        general_suffixes = suffixes.get("general", {})
        return general_suffixes.get(enhancement_level)
    
    def _apply_structure(self, 
                        prompt: str, 
                        strategy: Dict, 
                        intent_result: IntentResult,
                        enhancement_level: str) -> str:
        """Apply structural improvements to the prompt"""
        
        # Get structure rules for this model
        structure_rules = strategy.get("structure", {})
        
        # Apply basic formatting
        formatted_prompt = prompt.strip()
        
        # Apply intent-specific structure
        if intent_result.primary_intent.value in structure_rules:
            intent_structure = structure_rules[intent_result.primary_intent.value]
            
            # Apply structure template if available
            if "template" in intent_structure:
                template = intent_structure["template"]
                formatted_prompt = template.format(original_prompt=formatted_prompt)
        
        return formatted_prompt
    
    def _get_claude_strategy(self) -> Dict:
        """Optimization strategy for Claude models"""
        return {
            "prefixes": {
                "coding": {
                    "light": "I need help with a coding task:",
                    "medium": "I'm working on a coding project and need assistance. Please provide clear, well-commented code:",
                    "heavy": "I'm working on a complex coding project and need detailed assistance. Please provide comprehensive, well-documented code with explanations:"
                },
                "writing": {
                    "light": "Please help me with writing:",
                    "medium": "I need assistance with writing. Please provide clear, well-structured content:",
                    "heavy": "I need comprehensive writing assistance. Please provide detailed, well-structured content with explanations of your approach:"
                },
                "question": {
                    "light": "I have a question:",
                    "medium": "I'd like to understand something better. Please provide a clear explanation:",
                    "heavy": "I'm seeking a comprehensive understanding of this topic. Please provide a detailed explanation with examples:"
                },
                "conversation": {
                    "light": "",
                    "medium": "I'd like to have a helpful conversation about:",
                    "heavy": "I'm looking for an in-depth discussion about:"
                },
                "general": {
                    "light": "",
                    "medium": "Please help me with the following:",
                    "heavy": "I need comprehensive assistance with the following task:"
                }
            },
            "suffixes": {
                "coding": {
                    "light": "Please provide clean code.",
                    "medium": "Please provide clean, commented code with brief explanations.",
                    "heavy": "Please provide clean, well-documented code with detailed explanations, error handling, and best practices."
                },
                "writing": {
                    "light": "Please keep it concise.",
                    "medium": "Please ensure the writing is clear and well-structured.",
                    "heavy": "Please ensure the writing is comprehensive, well-structured, and includes relevant examples or evidence."
                },
                "question": {
                    "light": "Please provide a clear answer.",
                    "medium": "Please provide a clear explanation with examples if helpful.",
                    "heavy": "Please provide a comprehensive explanation with examples, context, and related concepts."
                },
                "general": {
                    "light": "Please be helpful and concise.",
                    "medium": "Please provide a thoughtful and well-structured response.",
                    "heavy": "Please provide a comprehensive, well-structured response with detailed explanations and examples."
                }
            },
            "structure": {
                "coding": {
                    "template": "<task>\n{original_prompt}\n</task>\n\nPlease provide a solution that includes:\n1. Clear, commented code\n2. Explanation of the approach\n3. Example usage if applicable"
                },
                "analysis": {
                    "template": "<analysis_request>\n{original_prompt}\n</analysis_request>\n\nPlease structure your analysis with:\n1. Key findings\n2. Supporting evidence\n3. Conclusions and recommendations"
                }
            }
        }
    
    def _get_gpt4_strategy(self) -> Dict:
        """Optimization strategy for GPT-4"""
        return {
            "prefixes": {
                "coding": {
                    "light": "Code request:",
                    "medium": "You are a skilled programmer. Please help with this coding task:",
                    "heavy": "You are an expert software developer with deep knowledge of best practices. Please help with this coding task:"
                },
                "writing": {
                    "light": "Writing request:",
                    "medium": "You are a skilled writer. Please help with this writing task:",
                    "heavy": "You are an expert writer with extensive experience. Please help with this writing task:"
                },
                "question": {
                    "light": "Question:",
                    "medium": "You are a knowledgeable assistant. Please answer this question:",
                    "heavy": "You are an expert in this field. Please provide a comprehensive answer to this question:"
                },
                "conversation": {
                    "light": "",
                    "medium": "You are a helpful and friendly assistant.",
                    "heavy": "You are a knowledgeable and engaging conversational partner."
                },
                "general": {
                    "light": "",
                    "medium": "You are a helpful assistant.",
                    "heavy": "You are an expert assistant with deep knowledge across many domains."
                }
            },
            "suffixes": {
                "coding": {
                    "light": "Provide working code.",
                    "medium": "Provide working code with comments and brief explanation.",
                    "heavy": "Provide working code with detailed comments, explanation of approach, potential optimizations, and error handling."
                },
                "writing": {
                    "light": "Keep it clear and concise.",
                    "medium": "Ensure clarity, good structure, and appropriate tone.",
                    "heavy": "Ensure excellent structure, engaging tone, and comprehensive coverage of the topic."
                },
                "question": {
                    "light": "Provide a clear answer.",
                    "medium": "Provide a clear answer with relevant examples.",
                    "heavy": "Provide a comprehensive answer with examples, context, and actionable insights."
                },
                "general": {
                    "light": "Be helpful and direct.",
                    "medium": "Be helpful, clear, and well-organized.",
                    "heavy": "Be comprehensive, insightful, and provide actionable guidance."
                }
            },
            "structure": {
                "coding": {
                    "template": "Task: {original_prompt}\n\nPlease provide:\n1. Working code solution\n2. Explanation of the approach\n3. Key considerations or best practices"
                },
                "writing": {
                    "template": "Writing task: {original_prompt}\n\nPlease ensure the response:\n1. Addresses the prompt directly\n2. Is well-structured and engaging\n3. Maintains appropriate tone and style"
                }
            }
        }
    
    def _get_gpt35_strategy(self) -> Dict:
        """Optimization strategy for GPT-3.5"""
        # Similar to GPT-4 but simpler
        gpt4_strategy = self._get_gpt4_strategy()
        
        # Simplify the prefixes and suffixes for GPT-3.5
        for intent in gpt4_strategy["prefixes"]:
            for level in gpt4_strategy["prefixes"][intent]:
                if level == "heavy":
                    gpt4_strategy["prefixes"][intent][level] = gpt4_strategy["prefixes"][intent]["medium"]
        
        return gpt4_strategy
    
    def _get_gemini_strategy(self) -> Dict:
        """Optimization strategy for Gemini"""
        return {
            "prefixes": {
                "coding": {
                    "light": "Help me with coding:",
                    "medium": "I need help with a coding problem. Please provide a clear solution:",
                    "heavy": "I need comprehensive help with a coding problem. Please provide a detailed solution with explanations:"
                },
                "writing": {
                    "light": "Help me write:",
                    "medium": "I need help with writing. Please create clear, well-organized content:",
                    "heavy": "I need comprehensive writing help. Please create detailed, well-structured content with thorough explanations:"
                },
                "question": {
                    "light": "I want to know:",
                    "medium": "I'm curious about something. Please explain it clearly:",
                    "heavy": "I want to understand this topic deeply. Please provide a comprehensive explanation:"
                },
                "conversation": {
                    "light": "",
                    "medium": "Let's discuss:",
                    "heavy": "I'd like to have an in-depth conversation about:"
                },
                "general": {
                    "light": "",
                    "medium": "Please help me with:",
                    "heavy": "I need comprehensive help with:"
                }
            },
            "suffixes": {
                "coding": {
                    "light": "Show me the code.",
                    "medium": "Show me the code with explanations.",
                    "heavy": "Show me the code with detailed explanations, examples, and best practices."
                },
                "writing": {
                    "light": "Make it clear and readable.",
                    "medium": "Make it clear, well-structured, and engaging.",
                    "heavy": "Make it comprehensive, well-structured, and include relevant examples and details."
                },
                "question": {
                    "light": "Explain it simply.",
                    "medium": "Explain it clearly with examples.",
                    "heavy": "Explain it comprehensively with examples, context, and practical applications."
                },
                "general": {
                    "light": "Be helpful and clear.",
                    "medium": "Be helpful, clear, and well-organized.",
                    "heavy": "Be comprehensive, insightful, and include practical guidance."
                }
            },
            "structure": {
                "coding": {
                    "template": "Coding task: {original_prompt}\n\nPlease provide:\n• Working code\n• Clear explanation\n• Example usage"
                },
                "question": {
                    "template": "Question: {original_prompt}\n\nPlease explain:\n• The main concept\n• Key details\n• Practical examples"
                }
            }
        }
    
    def get_model_specific_guidelines(self, target_model: LLMModel) -> List[str]:
        """Get specific guidelines for optimizing prompts for this model"""
        
        guidelines = {
            LLMModel.CLAUDE_35_SONNET: [
                "Use XML tags for structure when helpful",
                "Be polite and conversational",
                "Provide clear context upfront",
                "Ask for step-by-step thinking when needed",
                "Use specific examples to clarify requests"
            ],
            LLMModel.GPT4: [
                "Define roles clearly (You are a...)",
                "Use numbered lists for multi-step requests",
                "Specify output format explicitly",
                "Include examples of desired output",
                "Break complex tasks into steps"
            ],
            LLMModel.GEMINI: [
                "Front-load the main task/question",
                "Use natural, conversational language",
                "Ask for reasoning explanations",
                "Use bullet points for clarity",
                "Provide context but keep it focused"
            ]
        }
        
        return guidelines.get(target_model, []) 