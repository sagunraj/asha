from django.db import models


class AppSetting(models.Model):
    """Global application settings"""
    
    key = models.CharField(max_length=255, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'App Setting'
        verbose_name_plural = 'App Settings'
    
    def __str__(self):
        return f"{self.key} = {self.value}"


class ErrorLog(models.Model):
    """Log for application errors"""
    
    error_type = models.CharField(max_length=255)
    error_message = models.TextField()
    stack_trace = models.TextField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.error_type} - {self.created_at}"
