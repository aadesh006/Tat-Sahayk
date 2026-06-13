import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    DataCollatorWithPadding
)

import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

from typing import Dict, List, Optional, Tuple
import logging
from pathlib import Path
import json
import sys
from dataclasses import dataclass

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings
from src.models.base_model import BaseModel

logger = logging.getLogger(__name__)


class HazardDataset(Dataset):
    
    def __init__(
        self,
        texts: List[str],
        labels: Optional[List[int]] = None,
        tokenizer=None,
        max_length: int = 128
    ):
      
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
        
        logger.info("Pre-tokenizing dataset for faster training...")
        self.encodings = self.tokenizer(
            texts,
            truncation=True,
            padding=False,  
            max_length=max_length,
            return_tensors=None  
        )
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        item = {
            'input_ids': self.encodings['input_ids'][idx],
            'attention_mask': self.encodings['attention_mask'][idx]
        }
        
        if self.labels is not None:
            item['labels'] = self.labels[idx]
        
        return item


class HazardTextClassifier(BaseModel):
   
    
    def __init__(
        self,
        model_name: str = 'distilbert-base-uncased',
        num_labels: int = 6
    ):
       
        super().__init__(model_name)
        
        self.num_labels = num_labels
        self.max_length = settings.MAX_SEQ_LENGTH
        

        self.label2id = {
            'none': 0,
            'tsunami': 1,
            'storm_surge': 2,
            'high_waves': 3,
            'cyclone': 4,
            'coastal_erosion': 5
        }
        self.id2label = {v: k for k, v in self.label2id.items()}
        
        logger.info(f"Loading tokenizer and model: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            use_fast=True  
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        if hasattr(self.model, 'gradient_checkpointing_enable'):
            self.model.gradient_checkpointing_enable()
        
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'val_accuracy': [],
            'val_f1': []
        }
        
        logger.info(f"Model initialized with {num_labels} classes")
        logger.info(f"Total parameters: {sum(p.numel() for p in self.model.parameters()):,}")
        logger.info(f"Trainable parameters: {sum(p.numel() for p in self.model.parameters() if p.requires_grad):,}")
    
    def prepare_data(
        self,
        df: pd.DataFrame,
        text_col: str = 'text',
        label_col: str = 'hazard_type'
    ) -> HazardDataset:
       
        texts = df[text_col].tolist()
        
        if label_col in df.columns:
            labels = df[label_col].fillna('none').map(self.label2id).tolist()
        else:
            labels = None
        
        dataset = HazardDataset(
            texts=texts,
            labels=labels,
            tokenizer=self.tokenizer,
            max_length=self.max_length
        )
        
        return dataset
    
    def train(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        output_dir: Path,
        epochs: int = None,
        batch_size: int = None,
        learning_rate: float = None,
        **kwargs
    ) -> Dict:
       
        logger.info("="*80)
        logger.info("STARTING MODEL TRAINING")
        logger.info("="*80)
        
        epochs = epochs or settings.EPOCHS
        batch_size = batch_size or settings.BATCH_SIZE
        learning_rate = learning_rate or settings.LEARNING_RATE
        
        logger.info("Preparing datasets...")
        train_dataset = self.prepare_data(train_df)
        val_dataset = self.prepare_data(val_df)
        
        logger.info(f"Train size: {len(train_dataset)}")
        logger.info(f"Validation size: {len(val_dataset)}")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
        logger.info(f"Training on device: {device}")
        
        if device.type == "mps":
            batch_size = min(batch_size, 16)  
            logger.info(f"Adjusted batch size for MPS: {batch_size}")
        
        data_collator = DataCollatorWithPadding(
            tokenizer=self.tokenizer,
            padding=True,
            max_length=self.max_length
        )
        
        training_args = TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size * 2,  
            learning_rate=learning_rate,
            warmup_ratio=0.1,  
            weight_decay=0.01,
            
            optim="adamw_torch",  
            lr_scheduler_type="cosine",  
            gradient_accumulation_steps=2,  
            max_grad_norm=1.0,  
            
            gradient_checkpointing=True,
            fp16=False,  
            bf16=False,  
            dataloader_num_workers=0,  
            dataloader_pin_memory=False,  
            
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            greater_is_better=True,
            save_total_limit=2,
            
            logging_dir=str(output_dir / 'logs'),
            logging_strategy="steps",
            logging_steps=10,
            report_to="none",
            
            seed=42,
            data_seed=42,
        )
        
        def compute_metrics(pred):
            labels = pred.label_ids
            preds = pred.predictions.argmax(-1)
            
            precision, recall, f1, _ = precision_recall_fscore_support(
                labels, preds, average='weighted', zero_division=0
            )
            acc = accuracy_score(labels, preds)
            
            return {
                'accuracy': acc,
                'f1': f1,
                'precision': precision,
                'recall': recall
            }
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            data_collator=data_collator,  
            compute_metrics=compute_metrics,
            callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
        )
        
        # Train
        logger.info("\nStarting training...")
        logger.info(f"Epochs: {epochs}")
        logger.info(f"Batch size: {batch_size}")
        logger.info(f"Effective batch size: {batch_size * 2}")
        logger.info(f"Learning rate: {learning_rate}")
        logger.info(f"Device: {training_args.device}")
        logger.info(f"Total training steps: {len(train_dataset) // batch_size * epochs}")
        
        train_result = trainer.train()
        
        for log in trainer.state.log_history:
            if 'loss' in log:
                self.history['train_loss'].append(log['loss'])
            if 'eval_loss' in log:
                self.history['val_loss'].append(log['eval_loss'])
            if 'eval_accuracy' in log:
                self.history['val_accuracy'].append(log['eval_accuracy'])
            if 'eval_f1' in log:
                self.history['val_f1'].append(log['eval_f1'])
        
        logger.info("\nSaving model...")
        self.save(output_dir)
        
        logger.info("\nFinal evaluation on validation set...")
        eval_result = trainer.evaluate()
        
        logger.info("="*80)
        logger.info("TRAINING COMPLETE")
        logger.info("="*80)
        logger.info(f"Final validation accuracy: {eval_result['eval_accuracy']:.4f}")
        logger.info(f"Final validation F1: {eval_result['eval_f1']:.4f}")
        logger.info(f"Final validation precision: {eval_result['eval_precision']:.4f}")
        logger.info(f"Final validation recall: {eval_result['eval_recall']:.4f}")
        logger.info(f"Training time: {train_result.metrics['train_runtime']:.2f}s")
        logger.info(f"Model saved to: {output_dir}")
        
        self.is_trained = True
        
        return {
            'train_runtime': train_result.metrics['train_runtime'],
            'train_samples_per_second': train_result.metrics.get('train_samples_per_second', 0),
            'train_loss': train_result.metrics['train_loss'],
            'eval_accuracy': eval_result['eval_accuracy'],
            'eval_f1': eval_result['eval_f1'],
            'eval_precision': eval_result['eval_precision'],
            'eval_recall': eval_result['eval_recall']
        }
    
    @torch.no_grad()
    def predict(
        self,
        texts: List[str],
        return_probabilities: bool = True,
        batch_size: int = 32
    ) -> List[Dict]:
        self.model.eval()
        
        all_results = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            encodings = self.tokenizer(
                batch_texts,
                truncation=True,
                padding=True,
                max_length=self.max_length,
                return_tensors='pt'
            )
            
            device = next(self.model.parameters()).device
            encodings = {k: v.to(device) for k, v in encodings.items()}
            
            outputs = self.model(**encodings)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            
            predicted_labels = probabilities.argmax(dim=-1).cpu().numpy()
            confidences = probabilities.max(dim=-1).values.cpu().numpy()
            
            for j, (label_id, conf) in enumerate(zip(predicted_labels, confidences)):
                result = {
                    'text': batch_texts[j],
                    'predicted_label': self.id2label[int(label_id)],
                    'predicted_label_id': int(label_id),
                    'confidence': float(conf),
                    'is_hazard': int(label_id) != 0
                }
                
                if return_probabilities:
                    result['probabilities'] = {
                        self.id2label[k]: float(probabilities[j][k])
                        for k in range(self.num_labels)
                    }
                
                all_results.append(result)
        
        return all_results
    
    def evaluate(self, test_df: pd.DataFrame) -> Dict:
        logger.info("Evaluating on test set...")
        
        test_dataset = self.prepare_data(test_df)
        
        data_collator = DataCollatorWithPadding(
            tokenizer=self.tokenizer,
            padding=True,
            max_length=self.max_length
        )
        
        trainer = Trainer(
            model=self.model,
            data_collator=data_collator
        )
        
        predictions = trainer.predict(test_dataset)
        pred_labels = predictions.predictions.argmax(-1)
        true_labels = predictions.label_ids
        
        accuracy = accuracy_score(true_labels, pred_labels)
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, pred_labels, average='weighted', zero_division=0
        )
        
        class_report = classification_report(
            true_labels,
            pred_labels,
            target_names=[self.id2label[i] for i in range(self.num_labels)],
            output_dict=True,
            zero_division=0
        )
        
        cm = confusion_matrix(true_labels, pred_labels)
        
        results = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'classification_report': class_report,
            'confusion_matrix': cm.tolist()
        }
        
        logger.info(f"Test Accuracy: {accuracy:.4f}")
        logger.info(f"Test F1: {f1:.4f}")
        logger.info(f"Test Precision: {precision:.4f}")
        logger.info(f"Test Recall: {recall:.4f}")
        
        return results
    
    def save(self, path: Path):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        
        self.model.save_pretrained(path)
        self.tokenizer.save_pretrained(path)
        
        metadata = {
            'label2id': self.label2id,
            'id2label': self.id2label,
            'num_labels': self.num_labels,
            'max_length': self.max_length,
            'history': self.history,
            'is_trained': self.is_trained,
            'model_name': self.model_name
        }
        
        with open(path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {path}")
    
    def load(self, path: Path):
        path = Path(path)
        
        self.model = AutoModelForSequenceClassification.from_pretrained(path)
        self.tokenizer = AutoTokenizer.from_pretrained(path, use_fast=True)
        
        if hasattr(self.model, 'gradient_checkpointing_enable'):
            self.model.gradient_checkpointing_enable()
        
        with open(path / 'metadata.json', 'r') as f:
            metadata = json.load(f)
        
        self.label2id = metadata['label2id']
        self.id2label = {int(k): v for k, v in metadata['id2label'].items()}
        self.num_labels = metadata['num_labels']
        self.max_length = metadata['max_length']
        self.history = metadata.get('history', {})
        self.is_trained = metadata.get('is_trained', True)
        
        logger.info(f"Model loaded from {path}")


if __name__ == "__main__":
    from config.settings import settings
    
    train_df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_train.csv')
    val_df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_val.csv')
    test_df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test.csv')
    
    print(f"Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    
    model = HazardTextClassifier()
    
    metrics = model.train(
        train_df=train_df,
        val_df=val_df,
        output_dir=settings.MODELS_DIR / 'text_classifier',
        epochs=3
    )
    
    print("\nTraining Metrics:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
    
    test_texts = [
        "URGENT! Massive tsunami hitting Mumbai coast RIGHT NOW!",
        "Beautiful sunset at the beach today",
        "Storm surge warning issued for Chennai"
    ]
    
    predictions = model.predict(test_texts)
    
    print("\nTest Predictions:")
    for pred in predictions:
        print(f"\nText: {pred['text']}")
        print(f"Prediction: {pred['predicted_label']}")
        print(f"Confidence: {pred['confidence']:.3f}")
        print(f"Is Hazard: {pred['is_hazard']}")