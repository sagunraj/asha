"""
Exception handlers and error utilities
"""

from rest_framework.exceptions import APIException
from rest_framework import status
from django.utils.encoding import force_str


class CustomAPIException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A server error occurred.'
    default_code = 'error'

    def __init__(self, detail=None, code=None, status_code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        
        self.detail = detail
        self.code = code
        if status_code is not None:
            self.status_code = status_code


class ValidationError(CustomAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input.'
    default_code = 'invalid'


class NotFoundError(CustomAPIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found.'
    default_code = 'not_found'


class UnauthorizedError(CustomAPIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Unauthorized access.'
    default_code = 'unauthorized'


class PermissionDeniedError(CustomAPIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Permission denied.'
    default_code = 'permission_denied'
