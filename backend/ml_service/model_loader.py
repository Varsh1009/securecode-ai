import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
from typing import List, Dict
import os

class VulnerabilityDetector:
    def __init__(self, model_name: str = "microsoft/codebert-base"):
        """
        Initialize CodeBERT-based vulnerability detector
        """
        print(f"🤖 Loading ML model: {model_name}")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=10,  # Number of vulnerability categories
                problem_type="multi_label_classification"
            )
            
            # Set to eval mode
            self.model.eval()
            
            self.vulnerability_labels = [
                'SQL Injection',
                'Cross-Site Scripting (XSS)',
                'Hardcoded Secrets',
                'Path Traversal',
                'Command Injection',
                'Insecure Deserialization',
                'SSRF',
                'XXE',
                'Buffer Overflow',
                'Race Condition'
            ]
            
            print("✓ ML Model loaded successfully!")
            
        except Exception as e:
            print(f"⚠️  Could not load ML model: {e}")
            print("⚠️  Falling back to pattern matching only")
            self.model = None
            self.tokenizer = None
    
    def predict(self, code: str, threshold: float = 0.5) -> List[Dict]:
        """
        Predict vulnerabilities in code using ML model
        """
        if self.model is None or self.tokenizer is None:
            return []
        
        try:
            # Tokenize
            inputs = self.tokenizer(
                code,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            )
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                predictions = torch.sigmoid(outputs.logits)
            
            # Extract vulnerabilities above threshold
            results = []
            for idx, score in enumerate(predictions[0]):
                if score > threshold:
                    results.append({
                        'category': self.vulnerability_labels[idx],
                        'confidence': float(score),
                        'severity': self._get_severity(self.vulnerability_labels[idx]),
                        'source': 'ml_model'
                    })
            
            return results
            
        except Exception as e:
            print(f"Error in ML prediction: {e}")
            return []
    
    def _get_severity(self, category: str) -> str:
        """Map vulnerability category to severity"""
        critical = ['SQL Injection', 'Command Injection', 'Buffer Overflow']
        high = ['Cross-Site Scripting (XSS)', 'Path Traversal', 'Insecure Deserialization', 'SSRF', 'XXE']
        
        if category in critical:
            return 'CRITICAL'
        elif category in high:
            return 'HIGH'
        else:
            return 'MEDIUM'

# Singleton instance
_detector = None

def get_detector():
    """Get or create detector instance"""
    global _detector
    if _detector is None:
        _detector = VulnerabilityDetector()
    return _detector