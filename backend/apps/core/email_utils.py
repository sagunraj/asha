"""
Email utilities for sending OTP and tax receipts
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


def send_otp_email(email, otp):
    """Send OTP email to donor"""
    subject = 'Your Asha Login OTP'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Welcome to Asha</h2>
            <p>Your one-time password (OTP) to access your account is:</p>
            <div style="background-color: #f0f0f0; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">{otp}</span>
            </div>
            <p style="color: #666; font-size: 14px;">
                This OTP will expire in {settings.OTP_EXPIRY_MINUTES} minutes.
            </p>
            <p>If you didn't request this login, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <footer style="color: #999; font-size: 12px;">
                <p>KPALS (Kioch Partners of America)</p>
                <p>Supporting Children's Health in Nepal</p>
            </footer>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to Asha
    
    Your one-time password (OTP) to access your account is:
    
    {otp}
    
    This OTP will expire in {settings.OTP_EXPIRY_MINUTES} minutes.
    
    If you didn't request this login, please ignore this email.
    
    Best regards,
    KPALS Team
    """
    
    try:
        email_obj = EmailMultiAlternatives(
            subject,
            text_content,
            settings.DEFAULT_FROM_EMAIL,
            [email]
        )
        email_obj.attach_alternative(html_content, "text/html")
        email_obj.send()
        return True
    except Exception as e:
        print(f"Error sending OTP email: {str(e)}")
        return False


def send_tax_receipt_email(recipient_email, recipient_name, amount, tax_year, 
                           sender_name, sender_email, template_html):
    """Send tax receipt email to donor"""
    
    # Replace placeholders
    email_html = template_html.replace('{{donor_name}}', recipient_name)
    email_html = email_html.replace('{{amount}}', f"${amount:,.2f}")
    email_html = email_html.replace('{{tax_year}}', str(tax_year))
    email_html = email_html.replace('{{organization_name}}', 'KPALS')
    
    subject = f"Your {tax_year} Tax Receipt from KPALS"
    
    try:
        email_obj = EmailMultiAlternatives(
            subject,
            strip_tags(email_html),
            sender_email,
            [recipient_email]
        )
        email_obj.attach_alternative(email_html, "text/html")
        email_obj.send()
        return True
    except Exception as e:
        print(f"Error sending tax receipt email: {str(e)}")
        return False


def send_bulk_tax_receipts(recipients, sender_name, sender_email, template_html, tax_year):
    """
    Send tax receipts to multiple recipients
    
    Args:
        recipients: List of dicts with keys: email, name, amount
        sender_name: Name to show as sender
        sender_email: Email address to send from
        template_html: HTML template with placeholders
        tax_year: Tax year for the receipt
    
    Returns:
        Tuple: (successfully_sent, failed)
    """
    successfully_sent = 0
    failed = 0
    failed_recipients = []
    
    for recipient in recipients:
        try:
            success = send_tax_receipt_email(
                recipient['email'],
                recipient['name'],
                recipient['amount'],
                tax_year,
                sender_name,
                sender_email,
                template_html
            )
            if success:
                successfully_sent += 1
            else:
                failed += 1
                failed_recipients.append(recipient['email'])
        except Exception as e:
            failed += 1
            failed_recipients.append(recipient['email'])
    
    return successfully_sent, failed, failed_recipients
