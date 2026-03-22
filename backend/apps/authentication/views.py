from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPToken, DonorSession, AdminUser
from .serializers import OTPTokenSerializer, DonorSessionSerializer, AdminUserSerializer
from apps.donors.models import Donor


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """Send OTP to donor email"""
    email = request.data.get('email')
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if donor exists or will be created
    donor, created = Donor.objects.get_or_create(
        email=email,
        defaults={'name': email.split('@')[0]}  # Use email prefix as default name
    )
    
    # Create OTP
    otp_token = OTPToken.create_otp(email)
    
    # Send OTP email
    try:
        subject = 'Your Asha Login OTP'
        message = f"""
        Hello {donor.name},
        
        Your one-time password (OTP) is: {otp_token.otp}
        
        This OTP will expire in {settings.OTP_EXPIRY_MINUTES} minutes.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        KPALS Asha Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        return Response({
            'message': 'OTP sent to email',
            'email': email
        })
    
    except Exception as e:
        return Response({'error': f'Failed to send OTP: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """Verify OTP and return JWT tokens"""
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get OTP token
    try:
        otp_token = OTPToken.objects.get(email=email, otp=otp)
    except OTPToken.DoesNotExist:
        return Response({'error': 'Invalid OTP'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Validate OTP
    if not otp_token.is_valid():
        return Response({'error': 'OTP has expired'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Mark OTP as used
    otp_token.mark_as_used()
    
    # Get donor
    try:
        donor = Donor.objects.get(email=email)
    except Donor.DoesNotExist:
        return Response({'error': 'Donor not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Create session
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip_address = request.META.get('REMOTE_ADDR', '')
    
    session = DonorSession.objects.create(
        donor=donor,
        email=email,
        user_agent=user_agent,
        ip_address=ip_address
    )
    
    # Create JWT tokens
    from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
    
    # For donor login, we'll create a custom token
    refresh = RefreshToken()
    refresh['donor_id'] = str(donor.id)
    refresh['email'] = donor.email
    refresh['type'] = 'donor'
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'donor': {
            'id': str(donor.id),
            'name': donor.name,
            'email': donor.email
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_login(request):
    """Admin login endpoint (to be implemented with proper authentication)"""
    # This will be connected to Django's auth system
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # TODO: Authenticate against admin user
    return Response({'message': 'Admin login endpoint'})


class DonorSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing donor sessions"""
    serializer_class = DonorSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return DonorSession.objects.filter(donor__email=self.request.user.email)
