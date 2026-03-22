from rest_framework import serializers
from .models import Donation, DonationImportLog


class DonationSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source='donor.name', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    
    class Meta:
        model = Donation
        fields = [
            'id', 'donor', 'donor_name', 'campaign', 'campaign_name', 'amount', 'donation_date',
            'donation_type', 'is_recurring', 'recurrence_frequency', 'next_expected_donation',
            'source', 'status', 'reference_number', 'notes', 'tax_year', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tax_year', 'created_at', 'updated_at']


class DonationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for donation lists"""
    donor_name = serializers.CharField(source='donor.name', read_only=True)
    
    class Meta:
        model = Donation
        fields = ['id', 'donor', 'donor_name', 'amount', 'donation_date', 'donation_type', 'tax_year', 'status']
        read_only_fields = ['id']


class DonationImportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationImportLog
        fields = ['id', 'import_date', 'file_name', 'total_records', 'successful_imports', 'failed_imports', 'error_details', 'imported_by']
        read_only_fields = ['id', 'import_date']
