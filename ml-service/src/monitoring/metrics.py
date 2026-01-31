from datetime import datetime
from typing import Dict, List
import json
from pathlib import Path
from collections import defaultdict

class MetricsCollector:
    
    def __init__(self, metrics_file: Path):
        self.metrics_file = metrics_file
        self.metrics = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'errors': 0
        })
    
    def record_request(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        processing_time: float
    ):
        key = f"{method}:{endpoint}"
        
        self.metrics[key]['count'] += 1
        self.metrics[key]['total_time'] += processing_time
        
        if status_code >= 400:
            self.metrics[key]['errors'] += 1
    
    def get_metrics(self) -> Dict:
        result = {}
        
        for key, data in self.metrics.items():
            avg_time = data['total_time'] / data['count'] if data['count'] > 0 else 0
            error_rate = data['errors'] / data['count'] if data['count'] > 0 else 0
            
            result[key] = {
                'total_requests': data['count'],
                'total_errors': data['errors'],
                'error_rate': error_rate,
                'avg_response_time': avg_time
            }
        
        return result
    
    def save_metrics(self):
        metrics_data = {
            'timestamp': datetime.now().isoformat(),
            'metrics': self.get_metrics()
        }
        
        with open(self.metrics_file, 'w') as f:
            json.dump(metrics_data, f, indent=2)