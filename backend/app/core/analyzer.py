import re
from typing import List, Tuple
from app.models.response import PromptAnalysis, PromptIssue

class PromptAnalyzer:
    """Analyze prompt quality and provide suggestions"""
    
    # Quality thresholds
    MIN_WORD_COUNT = 10
    OPTIMAL_WORD_COUNT = 50
    MAX_WORD_COUNT = 500
    
    # Common vague terms
    VAGUE_TERMS = {
        "thing", "stuff", "something", "whatever", "somehow",
        "maybe", "probably", "basically", "actually", "really"
    }
    
    # Structure indicators
    STRUCTURE_PATTERNS = {
        "numbered": r'\d+\.',
        "bulleted": r'[\*\-\•]',
        "sections": r'\n\n',
        "questions": r'\?',
    }
    
    def analyze(self, prompt: str) -> PromptAnalysis:
        """Analyze a prompt and return quality metrics"""
        word_count = len(prompt.split())
        estimated_tokens = word_count * 1.3  # Rough estimation
        
        # Calculate scores (simplified for now)
        length_score = min(100, max(0, 100 - abs(word_count - 50) * 2))
        clarity_score = self._analyze_clarity(prompt)
        specificity_score = self._analyze_specificity(prompt)
        structure_score = self._analyze_structure(prompt)
        
        overall_score = (length_score + clarity_score + specificity_score + structure_score) / 4
        
        issues = self._identify_issues(prompt, word_count)
        
        return PromptAnalysis(
            quality_score=overall_score,
            issues=issues,
            strengths=[],
            suggestions=[],
            word_count=word_count,
            estimated_tokens=int(estimated_tokens)
        )
    
    def _analyze_clarity(self, prompt: str) -> float:
        """Analyze prompt clarity"""
        # Simple heuristics
        score = 70  # Base score
        
        if "please" in prompt.lower():
            score += 10
        if "?" in prompt:
            score += 10
        if len(prompt.split()) > 100:
            score -= 20
        if len(prompt.split()) < 10:
            score -= 15
            
        return max(0, min(100, score))
    
    def _analyze_specificity(self, prompt: str) -> float:
        """Analyze prompt specificity"""
        score = 60  # Base score
        
        # Check for specific details
        if any(word in prompt.lower() for word in ["example", "specific", "detailed", "format"]):
            score += 20
        if any(word in prompt.lower() for word in ["vague", "general", "any"]):
            score -= 15
            
        return max(0, min(100, score))
    
    def _analyze_structure(self, prompt: str) -> float:
        """Analyze prompt structure"""
        score = 75  # Base score
        
        sentences = prompt.split('.')
        if len(sentences) > 3:
            score += 10
        if len(sentences) < 2:
            score -= 10
            
        return max(0, min(100, score))
    
    def _identify_issues(self, prompt: str, word_count: int) -> List[PromptIssue]:
        """Identify specific issues with the prompt"""
        issues = []
        
        if word_count < 10:
            issues.append(PromptIssue(
                issue_type="length",
                severity="high",
                description="Prompt is too short",
                suggestion="Add more context and details to your prompt"
            ))
        
        if word_count > 200:
            issues.append(PromptIssue(
                issue_type="length",
                severity="medium",
                description="Prompt is very long",
                suggestion="Consider breaking it into smaller, focused requests"
            ))
        
        if "?" not in prompt:
            issues.append(PromptIssue(
                issue_type="clarity",
                severity="medium",
                description="No clear question or request",
                suggestion="End your prompt with a specific question or request"
            ))
        
        return issues