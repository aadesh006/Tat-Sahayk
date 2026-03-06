#!/usr/bin/env python3
"""
Test script for OTP SMS functionality
Run this to test if AWS SNS is working correctly
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.aws_services import send_otp_sms, generate_otp
from app.core.config import settings

def test_otp_sms():
    print("=" * 60)
    print("🧪 Testing OTP SMS Functionality")
    print("=" * 60)
    
    # Check AWS credentials
    print("\n1️⃣ Checking AWS Credentials...")
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        print("❌ ERROR: AWS credentials not found in .env file!")
        print("\nPlease add to backend/.env:")
        print("AWS_ACCESS_KEY_ID=your_access_key")
        print("AWS_SECRET_ACCESS_KEY=your_secret_key")
        print("AWS_REGION=us-east-1")
        return
    
    print(f"✅ AWS Access Key ID: {settings.AWS_ACCESS_KEY_ID[:10]}...")
    print(f"✅ AWS Region: {settings.AWS_REGION}")
    
    # Get phone number from user
    print("\n2️⃣ Enter Phone Number to Test")
    print("-" * 60)
    phone = input("Enter 10-digit Indian mobile number (e.g., 9876543210): ").strip()
    
    # Validate phone number
    if not phone.isdigit() or len(phone) != 10:
        print("❌ ERROR: Please enter a valid 10-digit phone number")
        return
    
    # Generate OTP
    print("\n3️⃣ Generating OTP...")
    otp = generate_otp()
    print(f"✅ Generated OTP: {otp}")
    
    # Send SMS
    print("\n4️⃣ Sending SMS via AWS SNS...")
    print(f"📱 Sending to: +91{phone}")
    print("⏳ Please wait...")
    
    try:
        success = send_otp_sms(phone, otp)
        
        if success:
            print("\n" + "=" * 60)
            print("✅ SUCCESS! SMS sent successfully!")
            print("=" * 60)
            print(f"\n📱 Check your phone (+91{phone}) for the OTP")
            print(f"🔢 Expected OTP: {otp}")
            print("\nIf you don't receive the SMS within 1-2 minutes:")
            print("1. Check if AWS SNS is enabled in us-east-1")
            print("2. Check AWS CloudWatch logs for errors")
            print("3. Verify your AWS credentials have SNS permissions")
            print("4. Check if you have SMS spending limit set")
        else:
            print("\n" + "=" * 60)
            print("❌ FAILED! SMS could not be sent")
            print("=" * 60)
            print("\nPossible reasons:")
            print("1. AWS SNS not enabled in your region")
            print("2. Invalid AWS credentials")
            print("3. Insufficient permissions")
            print("4. SMS spending limit reached")
            print("5. Invalid phone number format")
            print("\nCheck backend logs for detailed error message")
    
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ ERROR occurred!")
        print("=" * 60)
        print(f"\nError details: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Verify AWS credentials in .env file")
        print("2. Check if boto3 is installed: pip install boto3")
        print("3. Verify AWS SNS is enabled in us-east-1")
        print("4. Check AWS IAM permissions for SNS")

def test_email():
    """Test email functionality"""
    from app.services.aws_services import send_disaster_alert_email
    
    print("\n" + "=" * 60)
    print("📧 Testing Email Functionality")
    print("=" * 60)
    
    email = input("\nEnter email address to test: ").strip()
    
    if not email or '@' not in email:
        print("❌ ERROR: Please enter a valid email address")
        return
    
    print(f"\n📧 Sending test email to: {email}")
    print("⏳ Please wait...")
    
    try:
        success = send_disaster_alert_email(
            to_email=email,
            user_name="Test User",
            disaster_type="Flood",
            location="Mumbai, Maharashtra (Test)",
            severity="high",
            description="This is a test email from तट-Sahayk. If you receive this, email alerts are working correctly!"
        )
        
        if success:
            print("\n✅ SUCCESS! Email sent successfully!")
            print(f"📧 Check your inbox: {email}")
            print("\nNote: If in AWS SES sandbox mode, you can only send to verified emails")
        else:
            print("\n❌ FAILED! Email could not be sent")
            print("\nPossible reasons:")
            print("1. Sender email not verified in AWS SES")
            print("2. Recipient email not verified (if in sandbox mode)")
            print("3. AWS SES not enabled in us-east-1")
            print("4. Invalid AWS credentials")
    
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")

if __name__ == "__main__":
    print("\n🚀 तट-Sahayk OTP & Email Testing Tool\n")
    
    while True:
        print("\nWhat would you like to test?")
        print("1. SMS OTP")
        print("2. Email Alerts")
        print("3. Both")
        print("4. Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == "1":
            test_otp_sms()
        elif choice == "2":
            test_email()
        elif choice == "3":
            test_otp_sms()
            test_email()
        elif choice == "4":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please enter 1, 2, 3, or 4")
        
        print("\n" + "=" * 60)
