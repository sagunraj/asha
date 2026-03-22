from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaxReceiptViewSet, TaxReceiptTemplateViewSet

router = DefaultRouter()
router.register(r'templates', TaxReceiptTemplateViewSet, basename='template')
router.register(r'receipts', TaxReceiptViewSet, basename='receipt')

urlpatterns = [
    path('', include(router.urls)),
]
