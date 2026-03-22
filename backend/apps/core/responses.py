"""
Response utilities and formatting
"""

from rest_framework.response import Response
from rest_framework import status


def success_response(data=None, message='Success', status_code=status.HTTP_200_OK):
    """Return a standardized success response"""
    return Response(
        {
            'success': True,
            'message': message,
            'data': data
        },
        status=status_code
    )


def error_response(message='Error', errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Return a standardized error response"""
    return Response(
        {
            'success': False,
            'message': message,
            'errors': errors or {}
        },
        status=status_code
    )


def paginated_response(paginator, items, request, serializer_class):
    """Return paginated response"""
    page = paginator.paginate_queryset(items, request)
    if page is not None:
        serializer = serializer_class(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = serializer_class(items, many=True)
    return Response({
        'count': len(items),
        'next': None,
        'previous': None,
        'results': serializer.data
    })
