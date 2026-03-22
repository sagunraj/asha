from django.db import models
from apps.donors.models import Donor
import uuid


class TaxReceipt(models.Model):
    """Tax receipt for donors"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='tax_receipts')
    tax_year = models.IntegerField()
    
    # Receipt details
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    donations_included = models.ManyToManyField('donations.Donation', blank=True)
    
    # Receipt template and content
    receipt_number = models.CharField(max_length=100, unique=True)
    template_used = models.ForeignKey('TaxReceiptTemplate', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Generated receipt
    receipt_html = models.TextField(blank=True, null=True)
    receipt_pdf_url = models.URLField(blank=True, null=True)
    
    # Email tracking
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_delivery_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('failed', 'Failed'),
            ('bounced', 'Bounced'),
        ],
        default='pending'
    )
    email_error_message = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-tax_year', '-created_at']
        unique_together = [['donor', 'tax_year']]
        indexes = [
            models.Index(fields=['donor', 'tax_year']),
            models.Index(fields=['email_delivery_status']),
        ]
    
    def __str__(self):
        return f"Tax Receipt - {self.donor.name} ({self.tax_year})"


class TaxReceiptTemplate(models.Model):
    """Customizable tax receipt email template"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    
    # Email details
    subject = models.CharField(max_length=255)
    body_html = models.TextField(help_text="Use {{donor_name}}, {{amount}}, {{tax_year}}, {{organization_name}} as placeholders")
    
    # Sender details
    sender_name = models.CharField(max_length=255, default='KPALS')
    sender_email = models.EmailField()
    
    # Receipt document footer
    footer_text = models.TextField(blank=True, null=True)
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Only one default template
        if self.is_default:
            TaxReceiptTemplate.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class TaxReceiptEmailLog(models.Model):
    """Log for tax receipt email campaigns"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tax_year = models.IntegerField()
    template_used = models.ForeignKey(TaxReceiptTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Campaign details
    total_recipients = models.IntegerField()
    successfully_sent = models.IntegerField(default=0)
    failed = models.IntegerField(default=0)
    
    sent_by = models.CharField(max_length=255, default='admin')
    sent_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"Tax Receipt Campaign - {self.tax_year} ({self.sent_at.date()})"
