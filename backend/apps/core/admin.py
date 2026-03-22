from django.contrib import admin
from .models import AppSetting, ErrorLog


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value')
    search_fields = ('key',)
    readonly_fields = ('key',)


@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ('error_type', 'created_at')
    list_filter = ('error_type', 'created_at')
    search_fields = ('error_type', 'error_message')
    readonly_fields = ('id', 'created_at')
