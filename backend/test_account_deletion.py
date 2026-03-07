"""
Test script to verify account deletion functionality
Run this after starting the backend server
"""
import requests
import json

BASE_URL = "http://localhost:5001/api/v1"

def test_account_deletion():
    print("🧪 Testing Account Deletion Functionality\n")
    
    # Step 1: Create a test user
    print("1️⃣ Creating test user...")
    signup_data = {
        "email": "delete_test@example.com",
        "password": "testpass123",
        "full_name": "Test User To Delete",
        "role": "citizen"
    }
    
    response = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
    if response.status_code != 200:
        print(f"❌ Signup failed: {response.text}")
        return
    
    print(f"✅ Test user created!\n")
    
    # Step 2: Login
    print("2️⃣ Logging in...")
    login_data = {
        "username": "delete_test@example.com",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Login successful!\n")
    
    # Step 3: Get user info
    print("3️⃣ Fetching user info...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get user: {response.text}")
        return
    
    user = response.json()
    print(f"✅ User: {user['full_name']} ({user['email']})")
    print(f"   User ID: {user['id']}\n")
    
    # Step 4: Create a test report
    print("4️⃣ Creating a test report...")
    report_data = {
        "hazard_type": "Flood",
        "description": "Test report for deletion",
        "severity": "medium",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "image_filenames": []
    }
    
    response = requests.post(f"{BASE_URL}/reports/", json=report_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to create report: {response.text}")
        return
    
    report = response.json()
    print(f"✅ Report created with ID: {report['id']}\n")
    
    # Step 5: Verify user has reports
    print("5️⃣ Verifying user has reports...")
    response = requests.get(f"{BASE_URL}/reports/my", headers=headers)
    reports = response.json()
    print(f"✅ User has {len(reports)} report(s)\n")
    
    # Step 6: Try to delete admin account (should fail)
    print("6️⃣ Testing admin account protection...")
    admin_login = {
        "username": "admin@tatsahayk.gov.in",  # Replace with actual admin email
        "password": "admin123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/admin-login", data=admin_login)
    if response.status_code == 200:
        admin_token = response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.delete(f"{BASE_URL}/auth/me", headers=admin_headers)
        if response.status_code == 403:
            print(f"✅ Admin account deletion blocked (as expected)\n")
        else:
            print(f"⚠️ Admin deletion returned unexpected status: {response.status_code}\n")
    else:
        print(f"⚠️ Skipping admin test (admin account not found)\n")
    
    # Step 7: Delete the test account
    print("7️⃣ Deleting test account...")
    response = requests.delete(f"{BASE_URL}/auth/me", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Account deletion failed: {response.text}")
        return
    
    print(f"✅ Account deleted successfully!\n")
    
    # Step 8: Verify account is deleted
    print("8️⃣ Verifying account deletion...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    
    if response.status_code == 401:
        print(f"✅ Account no longer exists (401 Unauthorized)\n")
    else:
        print(f"❌ Account still exists! Status: {response.status_code}\n")
        return
    
    # Step 9: Verify login fails
    print("9️⃣ Verifying login fails...")
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if response.status_code == 401:
        print(f"✅ Login failed as expected (account deleted)\n")
    else:
        print(f"❌ Login succeeded! Account was not deleted properly.\n")
        return
    
    print("🎉 All tests passed! Account deletion works correctly.")

if __name__ == "__main__":
    try:
        test_account_deletion()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
