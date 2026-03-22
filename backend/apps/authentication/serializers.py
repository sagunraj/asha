from rest_framework import serializers
from .models import OTPToken, DonorSession, AdminUser


class OTPTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPToken
        fields = ['email', 'otp', 'is_used']
        read_only_fields = ['otp', 'is_used']


class DonorSessionSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source='donor.name', read_only=True)
    
    class Meta:
        model = DonorSession
        fields = ['id', 'donor', 'donor_name', 'email', 'login_at', 'last_activity', 'is_active']
        read_only_fields = ['id', 'login_at', 'last_activity']


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'name', 'email', 'is_active', 'last_login', 'created_at']
        read_only_fields = ['id', 'last_login', 'created_at']


class AdminUserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'name', 'email', 'is_active', 'last_login', 'created_at', 'updated_at']
        read_only_fields = ['id', 'last_login', 'created_at', 'updated_at']
