"""
Test script to verify profile photo upload/delete functionality
Run this after starting the backend server
"""
import requests
import json

BASE_URL = "http://localhost:5001/api/v1"

def test_profile_photo():
    print("🧪 Testing Profile Photo Functionality\n")
    
    # Step 1: Login as a citizen
    print("1️⃣ Logging in as citizen...")
    login_data = {
        "username": "aadeshchaudhari14@gmail.com",  # Replace with your test user
        "password": "Aadesh@2006"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Login successful! Token: {token[:20]}...\n")
    
    # Step 2: Get current user info
    print("2️⃣ Fetching current user info...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get user: {response.text}")
        return
    
    user = response.json()
    print(f"✅ User: {user['full_name']} ({user['email']})")
    print(f"   Current profile_photo: {user.get('profile_photo', 'None')}\n")
    
    # Step 3: Upload a test image
    print("3️⃣ Uploading test image...")
    # Create a small test image (1x1 pixel PNG)
    test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    files = {'files': ('test.png', test_image, 'image/png')}
    response = requests.post(f"{BASE_URL}/media/upload-many", files=files, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Upload failed: {response.text}")
        return
    
    photo_url = response.json()["file_paths"][0]
    print(f"✅ Image uploaded: {photo_url}\n")
    
    # Step 4: Update profile with photo
    print("4️⃣ Updating profile with photo URL...")
    update_data = {"profile_photo": photo_url}
    response = requests.patch(
        f"{BASE_URL}/auth/me",
        json=update_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Profile update failed: {response.text}")
        return
    
    updated_user = response.json()
    print(f"✅ Profile updated!")
    print(f"   New profile_photo: {updated_user.get('profile_photo')}\n")
    
    # Step 5: Verify the photo is returned in /auth/me
    print("5️⃣ Verifying photo in /auth/me...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user = response.json()
    
    if user.get('profile_photo') == photo_url:
        print(f"✅ Photo verified in user response!\n")
    else:
        print(f"❌ Photo mismatch!")
        print(f"   Expected: {photo_url}")
        print(f"   Got: {user.get('profile_photo')}\n")
        return
    
    # Step 6: Delete profile photo
    print("6️⃣ Deleting profile photo...")
    update_data = {"profile_photo": None}
    response = requests.patch(
        f"{BASE_URL}/auth/me",
        json=update_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Delete failed: {response.text}")
        return
    
    updated_user = response.json()
    print(f"✅ Profile photo deleted!")
    print(f"   Current profile_photo: {updated_user.get('profile_photo')}\n")
    
    print("🎉 All tests passed!")

if __name__ == "__main__":
    try:
        test_profile_photo()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
