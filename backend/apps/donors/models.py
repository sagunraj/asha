from django.db import models
from django.core.validators import EmailValidator
import uuid


class Donor(models.Model):
    """Donor model to store donor information"""
    
    DONOR_CATEGORY_CHOICES = [
        ('one_time', 'One-Time Donor'),
        ('recurring', 'Recurring Donor'),
        ('major', 'Major Donor'),
        ('member', 'Sustaining Member'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, validators=[EmailValidator()])
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='United States')
    
    # Donor categorization
    category = models.CharField(
        max_length=20,
        choices=DONOR_CATEGORY_CHOICES,
        default='one_time'
    )
    
    # Donation tracking
    total_donations = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text='Total amount donated'
    )
    number_of_donations = models.IntegerField(default=0)
    last_donation_date = models.DateField(null=True, blank=True)
    
    # Communication preferences
    opt_in_email = models.BooleanField(default=True)
    opt_in_newsletter = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def update_donation_totals(self):
        """Update total donations and count from related donations"""
        from apps.donations.models import Donation
        donations = Donation.objects.filter(donor=self, is_active=True)
        self.total_donations = sum(d.amount for d in donations)
        self.number_of_donations = donations.count()
        if donations.exists():
            self.last_donation_date = donations.order_by('-donation_date').first().donation_date
        self.save()


class DonorAuditLog(models.Model):
    """Audit log for donor record changes"""
    
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('restore', 'Restored'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    changed_by = models.CharField(max_length=255, default='admin')  # Will link to admin user later
    changed_fields = models.JSONField(default=dict)  # Stores what changed
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.donor.name} - {self.action} at {self.timestamp}"


class Campaign(models.Model):
    """Campaign/Fund tracking for donations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    goal_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def total_raised(self):
        """Calculate total raised for this campaign"""
        from apps.donations.models import Donation
        return sum(d.amount for d in Donation.objects.filter(campaign=self, is_active=True))
