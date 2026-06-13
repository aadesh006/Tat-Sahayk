import requests
import json
import time
from typing import Dict

BASE_URL = "http://localhost:8000"

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test(name: str):
    print(f"\n{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}TEST: {name}{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*80}{Colors.ENDC}")

def print_success(message: str):
    print(f"{Colors.OKGREEN} {message}{Colors.ENDC}")

def print_error(message: str):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_result(label: str, value):
    print(f"{Colors.OKCYAN}{label}:{Colors.ENDC} {value}")

def test_health():
    print_test("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print_success("Health endpoint working")
        print_result("Status", data['status'])
        print_result("Version", data['version'])
        
        return True
    except Exception as e:
        print_error(f"Health check failed: {e}")
        return False

def test_text_analysis():
    print_test("Text Analysis")
    
    try:
        payload = {
            "text": "URGENT! Massive tsunami hitting Mumbai coast! Everyone evacuate immediately!",
            "include_entities": True,
            "include_sentiment": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/text",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print_success("Text analysis working")
        print_result("Text", data['text'][:50] + "...")
        print_result("Hazard Type", data['hazard_detection']['hazard_type'])
        print_result("Confidence", f"{data['hazard_detection']['confidence']:.3f}")
        print_result("Is Hazard", data['hazard_detection']['is_hazard'])
        print_result("Sentiment", data['sentiment']['sentiment'])
        print_result("Panic Level", data['sentiment']['panic_level'])
        print_result("Credibility", f"{data['credibility_score']:.3f}")
        print_result("Processing Time", f"{data['processing_time_ms']:.2f}ms")
        
        if data['entities']:
            print_result("Locations", data['entities'].get('locations', []))
        
        return True
    except Exception as e:
        print_error(f"Text analysis failed: {e}")
        return False

def test_batch_analysis():
    print_test("Batch Text Analysis")
    
    try:
        payload = {
            "texts": [
                "Tsunami warning for coastal areas!",
                "Beautiful day at the beach.",
                "Storm surge expected in Chennai.",
                "High waves reported at Kerala coast."
            ],
            "include_entities": True,
            "include_sentiment": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/batch",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print_success("Batch analysis working")
        print_result("Total Count", data['total_count'])
        print_result("Processing Time", f"{data['processing_time_ms']:.2f}ms")
        
        print(f"\n{Colors.OKBLUE}Results:{Colors.ENDC}")
        for i, result in enumerate(data['results'], 1):
            print(f"\n  {i}. {result['text'][:40]}...")
            print(f"     Hazard: {result['hazard_detection']['hazard_type']} "
                  f"(confidence: {result['hazard_detection']['confidence']:.3f})")
            print(f"     Credibility: {result['credibility_score']:.3f}")
        
        return True
    except Exception as e:
        print_error(f"Batch analysis failed: {e}")
        return False

def test_report_analysis():
    print_test("Report Analysis")
    
    try:
        payload = {
            "text": "Water receding rapidly at Juhu Beach. Unusual sea behavior. Everyone move to higher ground!",
            "latitude": 19.0896,
            "longitude": 72.8258,
            "has_media": True,
            "media_count": 2,
            "author_followers": 1500,
            "timestamp": "2025-01-30T10:00:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze/report",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print_success("Report analysis working")
        print_result("Report ID", data['report_id'])
        print_result("Hazard Type", data['hazard_detection']['hazard_type'])
        print_result("Confidence", f"{data['hazard_detection']['confidence']:.3f}")
        print_result("Sentiment", data['sentiment']['sentiment'])
        print_result("Panic Level", data['sentiment']['panic_level'])
        print_result("Credibility", f"{data['credibility_score']:.3f}")
        print_result("Location", f"({data['location']['latitude']:.4f}, {data['location']['longitude']:.4f})")
        print_result("Has Media", data['metadata']['has_media'])
        
        return True
    except Exception as e:
        print_error(f"Report analysis failed: {e}")
        return False

def test_hotspot_detection():
    print_test("Hotspot Detection")
    
    try:
        payload = {
            "reports": [
                {"latitude": 19.0760, "longitude": 72.8777, "hazard_type": "tsunami", "timestamp": "2025-01-30T10:00:00"},
                {"latitude": 19.0800, "longitude": 72.8800, "hazard_type": "tsunami", "timestamp": "2025-01-30T10:05:00"},
                {"latitude": 19.0750, "longitude": 72.8750, "hazard_type": "tsunami", "timestamp": "2025-01-30T10:10:00"},
                {"latitude": 13.0475, "longitude": 80.2824, "hazard_type": "storm_surge", "timestamp": "2025-01-30T11:00:00"},
                {"latitude": 13.0500, "longitude": 80.2850, "hazard_type": "storm_surge", "timestamp": "2025-01-30T11:05:00"},
                {"latitude": 13.0450, "longitude": 80.2800, "hazard_type": "storm_surge", "timestamp": "2025-01-30T11:10:00"},
            ],
            "min_reports": 2,
            "radius_km": 5.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/hotspots/detect",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print_success("Hotspot detection working")
        print_result("Hotspots Detected", data['total_count'])
        print_result("Processing Time", f"{data['processing_time_ms']:.2f}ms")
        
        if data['hotspots']:
            print(f"\n{Colors.OKBLUE}Detected Hotspots:{Colors.ENDC}")
            for hotspot in data['hotspots']:
                print(f"\n  {hotspot['hotspot_id']}:")
                print(f"    Location: ({hotspot['latitude']:.4f}, {hotspot['longitude']:.4f})")
                print(f"    Hazard Type: {hotspot['hazard_type']}")
                print(f"    Severity: {hotspot['severity']}")
                print(f"    Threat Level: {hotspot['threat_level']:.2f}/10")
                print(f"    Reports: {hotspot['report_count']}")
                print(f"    Radius: {hotspot['radius_km']:.2f} km")
        
        return True
    except Exception as e:
        print_error(f"Hotspot detection failed: {e}")
        return False

def test_model_info():
    print_test("Model Information")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/models/info")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print_success("Model info endpoint working")
        
        for model_name, model_info in data.items():
            print(f"\n{Colors.OKBLUE}{model_name}:{Colors.ENDC}")
            print(f"  Type: {model_info['model_type']}")
            print(f"  Status: {model_info['status']}")
            print(f"  Loaded: {model_info['loaded']}")
            if model_info.get('metadata'):
                print(f"  Metadata: {json.dumps(model_info['metadata'], indent=4)}")
        
        return True
    except Exception as e:
        print_error(f"Model info failed: {e}")
        return False

def test_performance():
    print_test("Performance Test")
    
    try:
        payload = {
            "text": "High waves reported at the coast.",
            "include_entities": False,
            "include_sentiment": False
        }
        
        requests.post(f"{BASE_URL}/api/v1/analyze/text", json=payload)
        
        times = []
        for _ in range(10):
            start = time.time()
            response = requests.post(f"{BASE_URL}/api/v1/analyze/text", json=payload)
            elapsed = (time.time() - start) * 1000
            times.append(elapsed)
            
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print_success("Performance test complete")
        print_result("Requests", len(times))
        print_result("Average Response Time", f"{avg_time:.2f}ms")
        print_result("Min Response Time", f"{min_time:.2f}ms")
        print_result("Max Response Time", f"{max_time:.2f}ms")
        
        return True
    except Exception as e:
        print_error(f"Performance test failed: {e}")
        return False

def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}TAT-SAHAYK ML API TEST SUITE{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}\n")
    
    print(f"{Colors.WARNING}Make sure the API server is running:{Colors.ENDC}")
    print(f"  python src/api/routes/main.py\n")
    
    time.sleep(1)
    
    tests = [
        ("Health Check", test_health),
        ("Text Analysis", test_text_analysis),
        ("Batch Analysis", test_batch_analysis),
        ("Report Analysis", test_report_analysis),
        ("Hotspot Detection", test_hotspot_detection),
        ("Model Info", test_model_info),
        ("Performance", test_performance)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Test crashed: {e}")
            results.append((name, False))
        
        time.sleep(0.5)
    
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}TEST SUMMARY{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.OKGREEN}✓ PASS{Colors.ENDC}" if result else f"{Colors.FAIL}✗ FAIL{Colors.ENDC}"
        print(f"  {name:30s} {status}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print(f"{Colors.OKGREEN}\n All tests passed!{Colors.ENDC}\n")
    else:
        print(f"{Colors.FAIL}\n Some tests failed{Colors.ENDC}\n")

if __name__ == "__main__":
    main()