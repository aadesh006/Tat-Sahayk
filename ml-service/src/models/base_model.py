from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import torch
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class BaseModel(ABC):
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None
        self.is_trained = False
        logger.info(f"Initialized {self.__class__.__name__}: {model_name}")
    
    @abstractmethod
    def train(self, train_data: Any, val_data: Optional[Any] = None, **kwargs) -> Dict:
        pass
    
    @abstractmethod
    def predict(self, input_data: Any) -> Any:
        pass
    
    @abstractmethod
    def save(self, path: Path):
        pass
    
    @abstractmethod
    def load(self, path: Path):
        pass
    
    def evaluate(self, test_data: Any) -> Dict:
        logger.warning("Evaluate method not implemented for this model")
        return {}
    
    def get_model_info(self) -> Dict:
        return {
            'model_name': self.model_name,
            'model_class': self.__class__.__name__,
            'is_trained': self.is_trained
        }