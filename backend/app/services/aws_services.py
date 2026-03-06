"""AWS Services for SMS (SNS) and Email (SES)"""
import boto3
import random
from datetime import datetime, timedelta
from app.core.config import settings

# Initialize AWS clients
sns_client = boto3.client(
    'sns',
    region_name='us-east-1',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

ses_client = boto3.client(
    'ses',
    region_name='us-east-1',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via AWS SNS SMS"""
    try:
        # Format phone number for international format (add +91 for India if not present)
        if not phone.startswith('+'):
            phone = f'+91{phone}'
        
        message = f"Your तट-Sahayk verification code is: {otp}\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone."
        
        response = sns_client.publish(
            PhoneNumber=phone,
            Message=message,
            MessageAttributes={
                'AWS.SNS.SMS.SenderID': {
                    'DataType': 'String',
                    'StringValue': 'TatSahayk'
                },
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'
                }
            }
        )
        return response['ResponseMetadata']['HTTPStatusCode'] == 200
    except Exception as e:
        print(f"SMS Error: {e}")
        return False

def send_disaster_alert_email(to_email: str, user_name: str, disaster_type: str, 
                               location: str, severity: str, description: str) -> bool:
    """Send disaster alert email via AWS SES"""
    try:
        subject = f"⚠️ {severity.upper()} Alert: {disaster_type} near your location"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); 
                          color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }}
                .alert-box {{ background: white; border-left: 4px solid #ef4444; 
                             padding: 20px; margin: 20px 0; border-radius: 5px; }}
                .severity-critical {{ border-left-color: #dc2626; }}
                .severity-high {{ border-left-color: #f97316; }}
                .severity-medium {{ border-left-color: #eab308; }}
                .severity-low {{ border-left-color: #22c55e; }}
                .button {{ display: inline-block; background: #0ea5e9; color: white; 
                          padding: 12px 30px; text-decoration: none; border-radius: 5px; 
                          margin: 20px 0; }}
                .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">तट-Sahayk</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Disaster Alert System</p>
                </div>
                <div class="content">
                    <h2 style="color: #1e293b; margin-top: 0;">Hello {user_name},</h2>
                    <p>A verified disaster report has been registered near your location. Please take necessary precautions.</p>
                    
                    <div class="alert-box severity-{severity.lower()}">
                        <h3 style="margin-top: 0; color: #1e293b;">🚨 {disaster_type}</h3>
                        <p><strong>Severity:</strong> <span style="color: #ef4444; font-weight: bold;">{severity.upper()}</span></p>
                        <p><strong>Location:</strong> {location}</p>
                        <p><strong>Details:</strong> {description}</p>
                    </div>
                    
                    <h3 style="color: #1e293b;">Recommended Actions:</h3>
                    <ul style="color: #475569;">
                        <li>Stay alert and follow official instructions</li>
                        <li>Keep emergency contacts handy</li>
                        <li>Prepare emergency supplies if needed</li>
                        <li>Monitor updates on तट-Sahayk platform</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="https://tat-sahayk.com" class="button">View on तट-Sahayk</a>
                    </div>
                    
                    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; 
                               border-radius: 5px; margin-top: 20px;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>Emergency Helplines:</strong><br>
                            Disaster Management: 1077 | Police: 100 | Medical: 102
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated alert from तट-Sahayk Disaster Management System</p>
                    <p>You received this because a disaster was reported near your registered location</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        तट-Sahayk Disaster Alert
        
        Hello {user_name},
        
        A verified disaster report has been registered near your location.
        
        Type: {disaster_type}
        Severity: {severity.upper()}
        Location: {location}
        Details: {description}
        
        Recommended Actions:
        - Stay alert and follow official instructions
        - Keep emergency contacts handy
        - Prepare emergency supplies if needed
        - Monitor updates on तट-Sahayk platform
        
        Emergency Helplines:
        Disaster Management: 1077
        Police: 100
        Medical: 102
        
        Visit: https://tat-sahayk.com
        
        This is an automated alert from तट-Sahayk Disaster Management System.
        """
        
        response = ses_client.send_email(
            Source='noreply@tat-sahayk.com',  # Must be verified in SES
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        return response['ResponseMetadata']['HTTPStatusCode'] == 200
    except Exception as e:
        print(f"Email Error: {e}")
        return False
