"""
URL Configuration for Asha
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API URLs
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/donors/', include('apps.donors.urls')),
    path('api/v1/donations/', include('apps.donations.urls')),
    path('api/v1/tax-receipts/', include('apps.tax_receipts.urls')),
    
    # JWT Token Refresh
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
