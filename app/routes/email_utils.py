import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional

# Get email settings from environment variables
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "your-email@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")
EMAIL_FROM = os.getenv("EMAIL_FROM", "TamuTalk Food Monitoring <your-email@gmail.com>")

async def send_password_reset_email(recipient_email: str, reset_url: str, user_name: Optional[str] = None):
    """
    Send a password reset email to the user.
    """
    # Create message container
    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset Your TamuTalk Password"
    message["From"] = EMAIL_FROM
    message["To"] = recipient_email
    
    # User name fallback
    user_name = user_name or "User"
    
    # Create the plain-text and HTML version of your message
    text = f"""
    Hi {user_name},
    
    We received a request to reset your password for your TamuTalk account.
    
    To reset your password, click on the link below or copy and paste it into your browser:
    {reset_url}
    
    This link will expire in 24 hours.
    
    If you didn't request a password reset, you can ignore this email.
    
    Best regards,
    The TamuTalk Team
    """
    
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff4b8b;">Reset Your TamuTalk Password</h2>
          <p>Hi {user_name},</p>
          <p>We received a request to reset the password for your TamuTalk account.</p>
          <p>To reset your password, click on the button below:</p>
          <p style="text-align: center;">
            <a href="{reset_url}" style="background-color: #ff4b8b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </p>
          <p>Or copy and paste the following link into your browser:</p>
          <p><a href="{reset_url}">{reset_url}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request a password reset, you can ignore this email.</p>
          <p>Best regards,<br>The TamuTalk Team</p>
        </div>
      </body>
    </html>
    """
    
    # Create both parts
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    
    # Attach parts to message
    message.attach(part1)
    message.attach(part2)
    
    # Connect to SMTP server and send email
    try:
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, recipient_email, message.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False