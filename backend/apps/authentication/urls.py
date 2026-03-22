from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import send_otp, verify_otp, admin_login, DonorSessionViewSet

router = DefaultRouter()
router.register(r'sessions', DonorSessionViewSet, basename='session')

urlpatterns = [
    path('send-otp/', send_otp, name='send_otp'),
    path('verify-otp/', verify_otp, name='verify_otp'),
    path('admin-login/', admin_login, name='admin_login'),
    path('', include(router.urls)),
]
