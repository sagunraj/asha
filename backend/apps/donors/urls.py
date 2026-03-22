from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonorViewSet, CampaignViewSet

router = DefaultRouter()
router.register(r'', DonorViewSet, basename='donor')
router.register(r'campaigns', CampaignViewSet, basename='campaign')

urlpatterns = [
    path('', include(router.urls)),
]
