from rest_framework import serializers
from .models import TaxReceipt, TaxReceiptTemplate, TaxReceiptEmailLog


class TaxReceiptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxReceiptTemplate
        fields = [
            'id', 'name', 'description', 'subject', 'body_html', 'sender_name',
            'sender_email', 'footer_text', 'is_default', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaxReceiptSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source='donor.name', read_only=True)
    donor_email = serializers.CharField(source='donor.email', read_only=True)
    
    class Meta:
        model = TaxReceipt
        fields = [
            'id', 'donor', 'donor_name', 'donor_email', 'tax_year', 'total_amount',
            'receipt_number', 'email_sent_at', 'email_delivery_status', 'receipt_pdf_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'receipt_number', 'receipt_html', 'receipt_pdf_url', 'created_at', 'updated_at']


class TaxReceiptEmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxReceiptEmailLog
        fields = [
            'id', 'tax_year', 'template_used', 'total_recipients', 'successfully_sent',
            'failed', 'sent_by', 'sent_at'
        ]
        read_only_fields = ['id', 'sent_at']
