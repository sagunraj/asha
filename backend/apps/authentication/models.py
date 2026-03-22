from django.db import models
from django.conf import settings
import uuid
import random
import string
from django.utils import timezone
from datetime import timedelta


class OTPToken(models.Model):
    """OTP tokens for donor login"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"OTP for {self.email} - {self.created_at}"
    
    @staticmethod
    def generate_otp():
        """Generate a random 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=settings.OTP_LENGTH))
    
    @classmethod
    def create_otp(cls, email):
        """Create a new OTP for the given email"""
        # Invalidate previous OTPs for this email
        cls.objects.filter(email=email, is_used=False).update(is_used=True)
        
        otp = cls.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        token = cls.objects.create(
            email=email,
            otp=otp,
            expires_at=expires_at
        )
        return token
    
    def is_valid(self):
        """Check if OTP is valid (not expired and not used)"""
        return not self.is_used and timezone.now() <= self.expires_at
    
    def mark_as_used(self):
        """Mark OTP as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()


class DonorSession(models.Model):
    """Track donor login sessions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    donor = models.ForeignKey('donors.Donor', on_delete=models.CASCADE, related_name='sessions')
    email = models.EmailField()
    login_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-login_at']
    
    def __str__(self):
        return f"{self.donor.name} - {self.login_at}"


class AdminUser(models.Model):
    """Admin user for the system"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)  # Will use Django's auth
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.email})"
