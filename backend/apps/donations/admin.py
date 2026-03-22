from django.contrib import admin
from .models import Donation, DonationImportLog


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('donor', 'amount', 'donation_date', 'donation_type', 'campaign', 'status', 'tax_year')
    list_filter = ('donation_type', 'status', 'donation_date', 'tax_year')
    search_fields = ('donor__name', 'donor__email', 'reference_number')
    readonly_fields = ('id', 'created_at', 'updated_at', 'tax_year')
    fieldsets = (
        ('Donor & Amount', {
            'fields': ('donor', 'amount', 'id')
        }),
        ('Donation Details', {
            'fields': ('donation_date', 'donation_type', 'is_recurring', 'recurrence_frequency', 'next_expected_donation')
        }),
        ('Source & Status', {
            'fields': ('source', 'status', 'reference_number')
        }),
        ('Campaign & Tax', {
            'fields': ('campaign', 'tax_year')
        }),
        ('Additional', {
            'fields': ('notes', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DonationImportLog)
class DonationImportLogAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'import_date', 'total_records', 'successful_imports', 'failed_imports')
    list_filter = ('import_date',)
    search_fields = ('file_name',)
    readonly_fields = ('id', 'import_date')
