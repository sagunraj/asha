from rest_framework import serializers
from .models import Donor, DonorAuditLog, Campaign


class DonorSerializer(serializers.ModelSerializer):
    total_raised = serializers.DecimalField(source='total_donations', read_only=True, max_digits=12, decimal_places=2)
    
    class Meta:
        model = Donor
        fields = [
            'id', 'name', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'country',
            'category', 'total_donations', 'total_raised', 'number_of_donations', 'last_donation_date',
            'opt_in_email', 'opt_in_newsletter', 'is_active', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_donations', 'number_of_donations', 'last_donation_date', 'created_at', 'updated_at']


class DonorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    
    class Meta:
        model = Donor
        fields = ['id', 'name', 'email', 'category', 'total_donations', 'last_donation_date', 'created_at']
        read_only_fields = ['id', 'created_at']


class DonorDetailSerializer(serializers.ModelSerializer):
    """Detailed donor serializer with related data"""
    donations_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Donor
        fields = '__all__'
        read_only_fields = ['id', 'total_donations', 'number_of_donations', 'last_donation_date', 'created_at', 'updated_at']
    
    def get_donations_count(self, obj):
        return obj.donations.filter(is_active=True).count()


class DonorAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonorAuditLog
        fields = ['id', 'donor', 'action', 'changed_by', 'changed_fields', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class CampaignSerializer(serializers.ModelSerializer):
    total_raised = serializers.SerializerMethodField()
    donations_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = ['id', 'name', 'description', 'goal_amount', 'total_raised', 'donations_count', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_raised(self, obj):
        return obj.total_raised
    
    def get_donations_count(self, obj):
        return obj.donations.filter(is_active=True).count()
