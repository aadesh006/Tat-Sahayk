import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor
import matplotlib.pyplot as plt

BASE_URL = "http://localhost:8000"

def test_single_request():
    start = time.time()
    
    response = requests.post(
        f"{BASE_URL}/api/v1/analyze/text",
        json={
            "text": "Tsunami warning!",
            "include_entities": False,
            "include_sentiment": False
        }
    )
    
    elapsed = time.time() - start
    return elapsed, response.status_code

def load_test(num_requests: int = 100, concurrent: int = 10):
    print(f"\n")
    print(f"\n")
    print(f"\n")
    print(f"LOAD TEST: {num_requests} requests with {concurrent} concurrent connections")
    print(f"\n")
    print(f"\n")
    print(f"\n")
    
    times = []
    errors = 0
    
    with ThreadPoolExecutor(max_workers=concurrent) as executor:
        futures = [executor.submit(test_single_request) for _ in range(num_requests)]
        
        for i, future in enumerate(futures, 1):
            elapsed, status = future.result()
            times.append(elapsed)
            
            if status != 200:
                errors += 1
            
            if i % 10 == 0:
                print(f"Progress: {i}/{num_requests} requests completed")
    
    avg_time = statistics.mean(times)
    median_time = statistics.median(times)
    min_time = min(times)
    max_time = max(times)
    p95_time = sorted(times)[int(len(times) * 0.95)]
    p99_time = sorted(times)[int(len(times) * 0.99)]
    
    print(f"\n")
    print(f"\n")
    print(f"\n")
    print("RESULTS")
    print(f"\n")
    print(f"\n")
    print(f"\n")
    print(f"Total requests:     {num_requests}")
    print(f"Successful:         {num_requests - errors}")
    print(f"Errors:             {errors}")
    print(f"Average time:       {avg_time:.3f}s")
    print(f"Median time:        {median_time:.3f}s")
    print(f"Min time:           {min_time:.3f}s")
    print(f"Max time:           {max_time:.3f}s")
    print(f"95th percentile:    {p95_time:.3f}s")
    print(f"99th percentile:    {p99_time:.3f}s")
    print(f"Requests/second:    {num_requests / sum(times):.2f}")
    
    plt.figure(figsize=(12, 6))
    
    plt.subplot(1, 2, 1)
    plt.hist(times, bins=30, color='skyblue', edgecolor='black')
    plt.xlabel('Response Time (s)')
    plt.ylabel('Frequency')
    plt.title('Response Time Distribution')
    plt.axvline(avg_time, color='r', linestyle='--', label=f'Avg: {avg_time:.3f}s')
    plt.axvline(p95_time, color='orange', linestyle='--', label=f'P95: {p95_time:.3f}s')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(times)
    plt.xlabel('Request Number')
    plt.ylabel('Response Time (s)')
    plt.title('Response Time Over Requests')
    plt.axhline(avg_time, color='r', linestyle='--', alpha=0.5)
    
    plt.tight_layout()
    plt.savefig('load_test_results.png', dpi=150)
    print(f"\n Saved visualization: load_test_results.png")

if __name__ == "__main__":
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print(" API is not running or not healthy")
            exit(1)
    except:
        print(" Cannot connect to API. Make sure it's running at", BASE_URL)
        exit(1)
    
    load_test(num_requests=100, concurrent=10)