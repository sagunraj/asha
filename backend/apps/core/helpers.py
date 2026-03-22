"""
Helper functions for common operations
"""

from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone


def format_currency(amount):
    """Format amount as currency string"""
    if isinstance(amount, Decimal):
        return f"${amount:,.2f}"
    return f"${float(amount):,.2f}"


def get_fiscal_year(date=None):
    """Get fiscal year for a given date (Jan-Dec)"""
    if date is None:
        date = timezone.now().date()
    return date.year


def parse_date_range(from_date, to_date):
    """Parse and validate date range strings"""
    try:
        if isinstance(from_date, str):
            from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
        if isinstance(to_date, str):
            to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
        return from_date, to_date
    except (ValueError, TypeError):
        return None, None


def get_month_statistics(donations_queryset):
    """Get donation statistics grouped by month"""
    from django.db.models import Sum, Count
    from django.db.models.functions import TruncMonth
    
    stats = donations_queryset.annotate(
        month=TruncMonth('donation_date')
    ).values('month').annotate(
        count=Count('id'),
        total=Sum('amount')
    ).order_by('month')
    
    return list(stats)


def get_year_statistics(donations_queryset):
    """Get donation statistics for a specific year"""
    from django.db.models import Sum, Count
    
    stats = {
        'total_donations': donations_queryset.count(),
        'total_amount': donations_queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
        'average_donation': 0,
        'recurring_count': donations_queryset.filter(is_recurring=True).count(),
        'one_time_count': donations_queryset.filter(is_recurring=False).count(),
    }
    
    if stats['total_donations'] > 0:
        stats['average_donation'] = stats['total_amount'] / stats['total_donations']
    
    return stats


def generate_receipt_number(tax_year):
    """Generate a unique receipt number"""
    import uuid
    return f"TR-{tax_year}-{uuid.uuid4().hex[:8].upper()}"


def send_email_batch(recipients, subject, html_content, sender_email, batch_size=50):
    """
    Send emails to multiple recipients in batches
    
    Args:
        recipients: List of email addresses
        subject: Email subject
        html_content: HTML content of email
        sender_email: Sender email address
        batch_size: Number of emails to send per batch
    
    Returns:
        dict: Statistics of sent/failed emails
    """
    from django.core.mail import EmailMultiAlternatives
    from django.utils.html import strip_tags
    
    sent = 0
    failed = 0
    failed_recipients = []
    
    # Split into batches
    for i in range(0, len(recipients), batch_size):
        batch = recipients[i:i + batch_size]
        
        for recipient in batch:
            try:
                email_obj = EmailMultiAlternatives(
                    subject,
                    strip_tags(html_content),
                    sender_email,
                    [recipient]
                )
                email_obj.attach_alternative(html_content, "text/html")
                email_obj.send()
                sent += 1
            except Exception as e:
                failed += 1
                failed_recipients.append({'email': recipient, 'error': str(e)})
    
    return {
        'sent': sent,
        'failed': failed,
        'failed_recipients': failed_recipients
    }


def validate_email(email):
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_phone(phone):
    """Validate phone number format"""
    import re
    # Remove all non-digit characters except + at the beginning
    cleaned = re.sub(r'[^\d+]', '', phone)
    # Check if it has at least 10 digits
    digits = re.sub(r'[^\d]', '', cleaned)
    return len(digits) >= 10


def truncate_string(s, length=50, suffix='...'):
    """Truncate string to specified length"""
    if len(s) <= length:
        return s
    return s[:length - len(suffix)] + suffix


def serialize_decimal(obj):
    """JSON serializer for Decimal objects"""
    from decimal import Decimal
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
