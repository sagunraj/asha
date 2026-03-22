from django.contrib import admin
from .models import Donor, DonorAuditLog, Campaign


@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'category', 'total_donations', 'number_of_donations', 'created_at')
    list_filter = ('category', 'is_active', 'opt_in_email', 'created_at')
    search_fields = ('name', 'email', 'phone')
    readonly_fields = ('id', 'created_at', 'updated_at', 'total_donations', 'number_of_donations')
    fieldsets = (
        ('Personal Information', {
            'fields': ('name', 'email', 'phone', 'id')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'zip_code', 'country')
        }),
        ('Donation Info', {
            'fields': ('category', 'total_donations', 'number_of_donations', 'last_donation_date')
        }),
        ('Preferences', {
            'fields': ('opt_in_email', 'opt_in_newsletter')
        }),
        ('Additional', {
            'fields': ('notes', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DonorAuditLog)
class DonorAuditLogAdmin(admin.ModelAdmin):
    list_display = ('donor', 'action', 'changed_by', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('donor__name', 'changed_by')
    readonly_fields = ('id', 'timestamp')


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'goal_amount', 'is_active')
    list_filter = ('is_active', 'start_date')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
