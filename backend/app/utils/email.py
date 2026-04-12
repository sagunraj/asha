import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..config import settings


def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> bool:
    if settings.email_backend == "console":
        print(f"\n{'='*60}")
        print(f"TO:      {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print(f"{'='*60}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"KPALS Asha <{settings.email_from}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.email_host, settings.email_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.email_user, settings.email_password)
            server.send_message(msg)
        return True
    except Exception as exc:
        print(f"Email send error: {exc}")
        return False


def send_otp_email(email: str, otp: str, donor_name: str = "") -> bool:
    subject = "Your Asha Login Code"
    body = (
        f"Hello {donor_name},\n\n"
        f"Your one-time login code is: {otp}\n\n"
        f"This code expires in {settings.otp_expiry_minutes} minutes.\n\n"
        f"If you didn't request this, please ignore this email.\n\n"
        f"KPALS Asha Team"
    )
    return send_email(email, subject, body)
