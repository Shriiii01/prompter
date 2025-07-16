import re
from typing import Dict, List, Tuple

try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False
    print("Warning: textblob not available, language detection disabled")

try:
    import language_tool_python
    LANGUAGE_TOOL_AVAILABLE = True
except ImportError:
    LANGUAGE_TOOL_AVAILABLE = False
    print("Warning: language-tool-python not available, grammar checking disabled")

class PromptPreprocessor:
    """Handles input preprocessing: typo fixes, language detection, basic cleanup"""
    
    def __init__(self):
        self.common_typos = {
            'hye': 'hey',
            'helo': 'hello',
            'wat': 'what',
            'wut': 'what',
            'u': 'you',
            'ur': 'your',
            'pls': 'please',
            'plz': 'please',
            'thx': 'thanks',
            'thnx': 'thanks',
            'rly': 'really',
            'gd': 'good',
            'nd': 'and',
            'bcs': 'because',
            'bcz': 'because',
            'dont': "don't",
            'wont': "won't",
            'cant': "can't",
            'shouldnt': "shouldn't",
            'wouldnt': "wouldn't",
            'couldnt': "couldn't",
            'isnt': "isn't",
            'arent': "aren't",
            'wasnt': "wasn't",
            'werent': "weren't",
            'hasnt': "hasn't",
            'havent': "haven't",
            'hadnt': "hadn't",
            'didnt': "didn't",
            'doesnt': "doesn't",
        }
        
        # Initialize grammar checker (optional, can be disabled for speed)
        self.grammar_checker = None
        if LANGUAGE_TOOL_AVAILABLE:
            try:
                self.grammar_checker = language_tool_python.LanguageTool('en-US')
                print("✅ Grammar checker initialized")
            except Exception as e:
                print(f"Warning: Grammar checker initialization failed: {e}")
                self.grammar_checker = None
        
        print(f"📝 Preprocessor initialized (textblob: {TEXTBLOB_AVAILABLE}, grammar: {self.grammar_checker is not None})")
    
    def preprocess(self, raw_prompt: str) -> Dict:
        """Main preprocessing pipeline"""
        
        # Step 1: Capture exactly as is
        original = raw_prompt
        
        # Step 2: Basic preprocessing
        cleaned = self._basic_cleanup(raw_prompt)
        typo_fixed = self._fix_common_typos(cleaned)
        
        # Language detection
        language = self._detect_language(typo_fixed)
        
        # Token/length analysis
        word_count = len(typo_fixed.split())
        char_count = len(typo_fixed)
        estimated_tokens = self._estimate_tokens(typo_fixed)
        
        # Grammar analysis
        grammar_issues = self._check_grammar(typo_fixed)
        
        return {
            'original': original,
            'cleaned': cleaned,
            'typo_fixed': typo_fixed,
            'language': language,
            'word_count': word_count,
            'char_count': char_count,
            'estimated_tokens': estimated_tokens,
            'grammar_issues': grammar_issues,
            'preprocessing_applied': {
                'typo_fixes': self._get_typo_fixes(raw_prompt, typo_fixed),
                'basic_cleanup': cleaned != raw_prompt,
                'grammar_checked': len(grammar_issues) > 0
            }
        }
    
    def _basic_cleanup(self, text: str) -> str:
        """Basic text cleanup"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Fix multiple punctuation
        text = re.sub(r'[!]{2,}', '!', text)
        text = re.sub(r'[?]{2,}', '?', text)
        text = re.sub(r'[.]{2,}', '...', text)
        
        return text
    
    def _fix_common_typos(self, text: str) -> str:
        """Fix common typos using our dictionary"""
        words = text.split()
        fixed_words = []
        
        for word in words:
            # Check for exact match (case-insensitive)
            lower_word = word.lower()
            if lower_word in self.common_typos:
                # Preserve original case
                if word.isupper():
                    fixed_words.append(self.common_typos[lower_word].upper())
                elif word.istitle():
                    fixed_words.append(self.common_typos[lower_word].title())
                else:
                    fixed_words.append(self.common_typos[lower_word])
            else:
                fixed_words.append(word)
        
        return ' '.join(fixed_words)
    
    def _detect_language(self, text: str) -> str:
        """Detect the language of the text"""
        if not TEXTBLOB_AVAILABLE:
            return 'en'  # Default to English
        
        try:
            blob = TextBlob(text)
            return blob.detect_language()
        except:
            return 'en'  # Default to English
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        # Rough estimation: 1 token ≈ 0.75 words
        word_count = len(text.split())
        return int(word_count * 1.3)
    
    def _check_grammar(self, text: str) -> List[Dict]:
        """Check for grammar issues"""
        issues = []
        
        if self.grammar_checker:
            try:
                matches = self.grammar_checker.check(text)
                for match in matches:
                    issues.append({
                        'message': match.message,
                        'offset': match.offset,
                        'length': match.errorLength,
                        'suggestions': match.replacements[:3]  # Top 3 suggestions
                    })
            except:
                pass
        
        return issues
    
    def _get_typo_fixes(self, original: str, fixed: str) -> List[Tuple[str, str]]:
        """Get list of typo fixes applied"""
        fixes = []
        original_words = original.split()
        fixed_words = fixed.split()
        
        if len(original_words) == len(fixed_words):
            for i, (orig, fix) in enumerate(zip(original_words, fixed_words)):
                if orig.lower() != fix.lower():
                    fixes.append((orig, fix))
        
        return fixes 