
import re
import string
from typing import List, Dict, Optional, Tuple
import spacy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
import logging

logger = logging.getLogger(__name__)


try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except LookupError:
    logger.info("Downloading required NLTK data...")
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('omw-1.4', quiet=True)

class TextPreprocessor:
    
    def __init__(self, language='english'):
        self.language = language
        self.stop_words = set(stopwords.words(language))
        

        self.keep_words = {'no', 'not', 'very', 'too', 'more', 'most', 'all', 'high', 'low'}
        self.stop_words = self.stop_words - self.keep_words
        

        try:
            self.nlp = spacy.load('en_core_web_sm', disable=['parser'])  
        except OSError:
            logger.error("spaCy model not found. Installing...")
            import os
            os.system('python -m spacy download en_core_web_sm')
            self.nlp = spacy.load('en_core_web_sm', disable=['parser'])
        

        self.stemmer = PorterStemmer()
        self.lemmatizer = WordNetLemmatizer()
        

        self.domain_terms = {
            'tsunami', 'cyclone', 'storm', 'surge', 'wave', 'waves', 'flood', 'flooding',
            'erosion', 'coast', 'coastal', 'sea', 'ocean', 'beach', 'shore', 'tide',
            'high', 'low', 'water', 'wind', 'rain', 'evacuation', 'alert', 'warning',
            'emergency', 'danger', 'risk', 'threat', 'hazard'
        }
        
        logger.info("TextPreprocessor initialized")
    
    def clean_text(self, text: str, preserve_case: bool = False) -> str:
        """
        Basic text cleaning
        
        Args:
            text: Input text
            preserve_case: If True, maintains original case
            
        Returns:
            Cleaned text
        """
        if not isinstance(text, str):
            return ""
        

        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        

        text = re.sub(r'\S+@\S+', '', text)
        

        text = re.sub(r'@\w+', '', text)
        

        text = re.sub(r'#(\w+)', r'\1', text)
        

        text = ' '.join(text.split())
        

        if not preserve_case:
            text = text.lower()
        
        return text.strip()
    
    def remove_punctuation(self, text: str, keep_important: bool = True) -> str:
        
        if keep_important:

            translator = str.maketrans('', '', string.punctuation.replace('!', '').replace('?', ''))
        else:
            translator = str.maketrans('', '', string.punctuation)
        
        return text.translate(translator)
    
    def remove_numbers(self, text: str, keep_year: bool = True) -> str:
       
        if keep_year:

            text = re.sub(r'\b\d{1,3}\b', '', text)
            text = re.sub(r'\b\d{5,}\b', '', text)
        else:
            text = re.sub(r'\d+', '', text)
        
        return ' '.join(text.split())
    
    def remove_stopwords(self, text: str, preserve_domain_terms: bool = True) -> str:
        
        tokens = word_tokenize(text)
        
        if preserve_domain_terms:
            filtered_tokens = [
                word for word in tokens 
                if word.lower() not in self.stop_words or word.lower() in self.domain_terms
            ]
        else:
            filtered_tokens = [word for word in tokens if word.lower() not in self.stop_words]
        
        return ' '.join(filtered_tokens)
    
    def lemmatize(self, text: str) -> str:
      
        doc = self.nlp(text)
        lemmatized = ' '.join([token.lemma_ for token in doc if not token.is_space])
        return lemmatized
    
    def stem(self, text: str) -> str:
       
        tokens = word_tokenize(text)
        stemmed = ' '.join([self.stemmer.stem(word) for word in tokens])
        return stemmed
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        
        doc = self.nlp(text)
        
        entities = {
            'locations': [],
            'organizations': [],
            'persons': [],
            'dates': [],
            'times': [],
            'all_entities': []
        }
        
        for ent in doc.ents:
            entity_info = {
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            }
            
            entities['all_entities'].append(entity_info)
            

            if ent.label_ in ['GPE', 'LOC', 'FAC']:  
                entities['locations'].append(ent.text)
            elif ent.label_ == 'ORG':  
                entities['organizations'].append(ent.text)
            elif ent.label_ == 'PERSON':  
                entities['persons'].append(ent.text)
            elif ent.label_ == 'DATE':  
                entities['dates'].append(ent.text)
            elif ent.label_ == 'TIME':  
                entities['times'].append(ent.text)
        
        return entities
    
    def preprocess(
        self,
        text: str,
        remove_stopwords: bool = True,
        lemmatize_text: bool = True,
        remove_punct: bool = True,
        remove_nums: bool = True,
        extract_ents: bool = False
    ) -> Dict[str, any]:
      
        result = {'original': text}
        
        cleaned = self.clean_text(text)
        result['cleaned'] = cleaned
        
        if remove_punct:
            cleaned = self.remove_punctuation(cleaned, keep_important=True)
        
        if remove_nums:
            cleaned = self.remove_numbers(cleaned, keep_year=True)
        
        if remove_stopwords:
            cleaned = self.remove_stopwords(cleaned, preserve_domain_terms=True)
        
        if lemmatize_text:
            cleaned = self.lemmatize(cleaned)
        
        result['processed'] = cleaned
        
        if extract_ents:
            result['entities'] = self.extract_entities(text)
        
        return result
    
    def batch_preprocess(
        self,
        texts: List[str],
        **kwargs
    ) -> List[Dict[str, any]]:
      
        return [self.preprocess(text, **kwargs) for text in texts]
    
    def get_simple_processed(self, text: str) -> str:
       
        result = self.preprocess(text)
        return result['processed']
    
    def analyze_text_quality(self, text: str) -> Dict[str, any]:
        
        tokens = word_tokenize(text.lower())
        
        metrics = {
            'length': len(text),
            'word_count': len(tokens),
            'unique_words': len(set(tokens)),
            'avg_word_length': sum(len(word) for word in tokens) / len(tokens) if tokens else 0,
            'lexical_diversity': len(set(tokens)) / len(tokens) if tokens else 0,
            'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
            'digit_ratio': sum(1 for c in text if c.isdigit()) / len(text) if text else 0,
            'punctuation_ratio': sum(1 for c in text if c in string.punctuation) / len(text) if text else 0,
        }
        
        return metrics



def quick_preprocess(text: str, preprocessor: TextPreprocessor = None) -> str:
  
    if preprocessor is None:
        preprocessor = TextPreprocessor()
    
    return preprocessor.get_simple_processed(text)



if __name__ == "__main__":

    preprocessor = TextPreprocessor()
    
    test_texts = [
        "URGENT! Massive TSUNAMI hitting Mumbai beach RIGHT NOW! Everyone evacuate! #emergency #tsunami http://example.com/photo",
        "Beautiful sunset at Goa beach today 🌅 @friend check this out #vacation",
        "Storm surge warning issued for Chennai coast. Water levels rising. Stay safe everyone.",
        "The National Weather Service has issued a cyclone warning for the eastern coast on January 15, 2025."
    ]
    
    print("="*80)
    print("TEXT PREPROCESSING EXAMPLES")
    print("="*80)
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n{'─'*80}")
        print(f"Example {i}:")
        print(f"{'─'*80}")
        
        result = preprocessor.preprocess(text, extract_ents=True)
        
        print(f"Original:  {result['original']}")
        print(f"Cleaned:   {result['cleaned']}")
        print(f"Processed: {result['processed']}")
        
        if result['entities']['locations']:
            print(f"Locations: {', '.join(result['entities']['locations'])}")
        if result['entities']['dates']:
            print(f"Dates:     {', '.join(result['entities']['dates'])}")
        
        quality = preprocessor.analyze_text_quality(text)
        print(f"Word count: {quality['word_count']}, Lexical diversity: {quality['lexical_diversity']:.2f}")