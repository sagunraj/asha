from django.db import models
from django.utils.timezone import now
from apps.donors.models import Donor, Campaign
import uuid


class Donation(models.Model):
    """Donation model to track donations from donors"""
    
    DONATION_TYPE_CHOICES = [
        ('one_time', 'One-Time'),
        ('recurring', 'Recurring'),
    ]
    
    DONATION_SOURCE_CHOICES = [
        ('check', 'Check'),
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('paypal', 'PayPal'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='donations')
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='donations')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    donation_date = models.DateField()
    donation_type = models.CharField(max_length=20, choices=DONATION_TYPE_CHOICES, default='one_time')
    
    # For recurring donations
    is_recurring = models.BooleanField(default=False)
    recurrence_frequency = models.CharField(
        max_length=20,
        choices=[('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')],
        null=True,
        blank=True
    )
    next_expected_donation = models.DateField(null=True, blank=True)
    
    source = models.CharField(max_length=20, choices=DONATION_SOURCE_CHOICES, default='check')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    
    # Reference information
    reference_number = models.CharField(max_length=100, blank=True, null=True, unique=True)
    notes = models.TextField(blank=True, null=True)
    
    # Tax year for receipts
    tax_year = models.IntegerField()
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-donation_date']
        indexes = [
            models.Index(fields=['donor', 'donation_date']),
            models.Index(fields=['tax_year']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.donor.name} - ${self.amount} ({self.donation_date})"
    
    def save(self, *args, **kwargs):
        # Auto-fill tax_year if not set
        if not self.tax_year:
            self.tax_year = self.donation_date.year
        super().save(*args, **kwargs)
        # Update donor totals
        self.donor.update_donation_totals()


class DonationImportLog(models.Model):
    """Log for CSV imports of donations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_date = models.DateTimeField(auto_now_add=True)
    file_name = models.CharField(max_length=255)
    total_records = models.IntegerField()
    successful_imports = models.IntegerField()
    failed_imports = models.IntegerField()
    error_details = models.JSONField(default=dict)
    imported_by = models.CharField(max_length=255, default='admin')
    
    class Meta:
        ordering = ['-import_date']
    
    def __str__(self):
        return f"{self.file_name} - {self.import_date}"
