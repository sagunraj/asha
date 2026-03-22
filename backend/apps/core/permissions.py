"""
Permission classes for API access control
"""

from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Allow access only to admin users.
    """
    
    def has_permission(self, request, view):
        return bool(request.user and hasattr(request.user, 'is_staff') and request.user.is_staff)


class IsDonorUser(permissions.BasePermission):
    """
    Allow access only to authenticated donor users.
    """
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allow access to the object owner or admin users.
    """
    
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'is_staff') and request.user.is_staff:
            return True
        return obj.donor_id == request.user.id
