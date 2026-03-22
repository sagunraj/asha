from django.contrib import admin
from .models import OTPToken, DonorSession, AdminUser


@admin.register(OTPToken)
class OTPTokenAdmin(admin.ModelAdmin):
    list_display = ('email', 'otp', 'created_at', 'expires_at', 'is_used')
    list_filter = ('is_used', 'created_at')
    search_fields = ('email', 'otp')
    readonly_fields = ('id', 'otp', 'created_at', 'expires_at', 'used_at')


@admin.register(DonorSession)
class DonorSessionAdmin(admin.ModelAdmin):
    list_display = ('donor', 'email', 'login_at', 'is_active')
    list_filter = ('is_active', 'login_at')
    search_fields = ('donor__name', 'email')
    readonly_fields = ('id', 'login_at', 'last_activity')


@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'is_active', 'last_login', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'email')
    readonly_fields = ('id', 'created_at', 'updated_at')
