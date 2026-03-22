from django.contrib import admin
from .models import TaxReceipt, TaxReceiptTemplate, TaxReceiptEmailLog


@admin.register(TaxReceipt)
class TaxReceiptAdmin(admin.ModelAdmin):
    list_display = ('donor', 'tax_year', 'total_amount', 'email_delivery_status', 'created_at')
    list_filter = ('tax_year', 'email_delivery_status', 'created_at')
    search_fields = ('donor__name', 'donor__email', 'receipt_number')
    readonly_fields = ('id', 'receipt_number', 'created_at', 'updated_at')


@admin.register(TaxReceiptTemplate)
class TaxReceiptTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'sender_email', 'is_default', 'is_active', 'created_at')
    list_filter = ('is_default', 'is_active', 'created_at')
    search_fields = ('name', 'sender_email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(TaxReceiptEmailLog)
class TaxReceiptEmailLogAdmin(admin.ModelAdmin):
    list_display = ('tax_year', 'total_recipients', 'successfully_sent', 'failed', 'sent_at')
    list_filter = ('tax_year', 'sent_at')
    search_fields = ('sent_by',)
    readonly_fields = ('id', 'sent_at')
