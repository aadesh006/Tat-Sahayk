import unittest
import requests
import pandas as pd
import time
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from config.settings import settings

BASE_URL = "http://localhost:8000"

class TestIntegration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code != 200:
                raise Exception("API not healthy")
        except Exception as e:
            raise Exception(
                f"API server not running at {BASE_URL}. "
                f"Start it with: python src/api/routes/main.py\n"
                f"Error: {e}"
            )
    
    def test_01_health_check(self):
        response = requests.get(f"{BASE_URL}/health")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
    
    def test_02_text_analysis_tsunami(self):
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/text",
            json={
                "text": "URGENT! Massive tsunami hitting Mumbai coast!",
                "include_entities": True,
                "include_sentiment": True
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data['hazard_detection']['is_hazard'])
        
        self.assertGreater(data['hazard_detection']['confidence'], 0.5)
        
        self.assertEqual(data['sentiment']['sentiment'], 'negative')
        
        self.assertIn(data['sentiment']['panic_level'], ['high', 'critical'])
    
    def test_03_text_analysis_non_hazard(self):
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/text",
            json={
                "text": "Beautiful sunny day at the beach!",
                "include_entities": True,
                "include_sentiment": True
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data['hazard_detection']['is_hazard'])
        self.assertIn(data['sentiment']['sentiment'], ['positive', 'neutral'])
    
    def test_04_batch_analysis(self):
        texts = [
            "Tsunami alert for coastal areas!",
            "Beach is lovely today.",
            "Storm surge warning issued.",
            "Perfect weather for swimming."
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/batch",
            json={"texts": texts}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data['total_count'], len(texts))
        self.assertEqual(len(data['results']), len(texts))
        self.assertTrue(data['results'][0]['hazard_detection']['is_hazard'])
        self.assertTrue(data['results'][2]['hazard_detection']['is_hazard'])
        self.assertFalse(data['results'][1]['hazard_detection']['is_hazard'])
        self.assertFalse(data['results'][3]['hazard_detection']['is_hazard'])
    
    def test_05_report_analysis(self):
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/report",
            json={
                "text": "Water receding rapidly at beach. Unusual behavior.",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "has_media": True,
                "media_count": 2,
                "author_followers": 1000
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('report_id', data)
        self.assertTrue(data['report_id'].startswith('RPT_'))
        self.assertIn('hazard_detection', data)
        self.assertIn('sentiment', data)
        self.assertIn('entities', data)
        self.assertIn('credibility_score', data)
        self.assertIn('location', data)
        self.assertGreater(data['credibility_score'], 0.3)
    
    def test_06_hotspot_detection(self):
        reports = []
        for i in range(5):
            reports.append({
                "latitude": 19.0760 + (i * 0.01),
                "longitude": 72.8777 + (i * 0.01),
                "hazard_type": "tsunami",
                "timestamp": "2025-01-30T10:00:00"
            })
        
        response = requests.post(
            f"{BASE_URL}/api/v1/hotspots/detect",
            json={
                "reports": reports,
                "min_reports": 3,
                "radius_km": 10.0
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data['total_count'], 0)
        
        if data['hotspots']:
            hotspot = data['hotspots'][0]
            self.assertIn('hotspot_id', hotspot)
            self.assertIn('threat_level', hotspot)
            self.assertIn('severity', hotspot)
    
    def test_07_model_info(self):
        response = requests.get(f"{BASE_URL}/api/v1/models/info")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('text_classifier', data)
        self.assertIn('sentiment_analyzer', data)
        self.assertIn('ner', data)
        for model_name, model_info in data.items():
            self.assertTrue(model_info['loaded'])
            self.assertEqual(model_info['status'], 'loaded')
    
    def test_08_performance(self):
        times = []
        
        for _ in range(10):
            start = time.time()
            
            response = requests.post(
                f"{BASE_URL}/api/v1/analyze/text",
                json={
                    "text": "Test text for performance",
                    "include_entities": False,
                    "include_sentiment": False
                }
            )
            
            elapsed = time.time() - start
            times.append(elapsed)
            
            self.assertEqual(response.status_code, 200)
        
        avg_time = sum(times) / len(times)
        self.assertLess(avg_time, 1.0, 
                       f"Average response time {avg_time:.3f}s exceeds 1s")
        
        print(f"\nPerformance: Avg {avg_time:.3f}s, "
              f"Min {min(times):.3f}s, Max {max(times):.3f}s")
    
    def test_09_error_handling(self):
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/text",
            json={"text": ""}
        )
        
        self.assertEqual(response.status_code, 422)  
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/report",
            json={
                "text": "Test",
                "latitude": 999,  
                "longitude": 999   
            }
        )
        
        self.assertEqual(response.status_code, 422)
    
    def test_10_end_to_end_workflow(self):
        reports = []
        
        test_reports = [
            {
                "text": "Tsunami warning at Mumbai!",
                "lat": 19.0760,
                "lon": 72.8777
            },
            {
                "text": "High waves at Mumbai coast!",
                "lat": 19.0800,
                "lon": 72.8800
            },
            {
                "text": "Storm surge at Chennai!",
                "lat": 13.0827,
                "lon": 80.2707
            }
        ]
        
        for report in test_reports:
            response = requests.post(
                f"{BASE_URL}/api/v1/analyze/report",
                json={
                    "text": report['text'],
                    "latitude": report['lat'],
                    "longitude": report['lon'],
                    "has_media": True
                }
            )
            
            self.assertEqual(response.status_code, 200)
            data = response.json()
            
            reports.append({
                "latitude": report['lat'],
                "longitude": report['lon'],
                "hazard_type": data['hazard_detection']['hazard_type'],
                "timestamp": data['metadata']['timestamp']
            })
        response = requests.post(
            f"{BASE_URL}/api/v1/hotspots/detect",
            json={
                "reports": reports,
                "min_reports": 2,
                "radius_km": 5.0
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        print(f"\nEnd-to-end test: {len(reports)} reports → "
              f"{data['total_count']} hotspots")

if __name__ == '__main__':
    unittest.main(verbosity=2)